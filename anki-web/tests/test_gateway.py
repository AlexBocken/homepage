import pathlib

import pytest
from fastapi.testclient import TestClient

from gateway import create_app
from instances import CapacityError, InstanceError, InstanceRegistry

USER_HEADER = "x-anki-user"


class Clock:
    def __init__(self) -> None:
        self.t = 1_000.0

    def __call__(self) -> float:
        return self.t

    def advance(self, secs: float) -> None:
        self.t += secs


@pytest.fixture
def world():
    clock = Clock()
    started: list[str] = []

    async def spawn(inst):
        started.append(inst.username)
        return object()

    async def health(inst):
        return True

    async def stop(inst):
        pass

    async def sleep(secs):
        clock.advance(secs)

    registry = InstanceRegistry(
        spawn=spawn,
        health=health,
        stop=stop,
        now=clock,
        sleep=sleep,
        socket_dir=pathlib.Path("/tmp/anki-web-test-sockets"),
    )
    return TestClient(create_app(registry=registry)), registry, started


def test_health_reports_how_many_instances_are_up(world):
    client, _, _ = world
    body = client.get("/healthz").json()
    assert body["status"] == "ok"
    assert body["instances"] == 0


class TestStartHook:
    def test_a_request_for_a_user_with_no_instance_starts_one(self, world):
        client, registry, started = world

        res = client.get("/", headers={USER_HEADER: "alex"})

        assert started == ["alex"]
        assert registry.ready("alex") is not None
        # 503 with a refresh, not a redirect: the browser retries the URL it
        # actually wanted, which by then goes straight to the child.
        assert res.status_code == 503
        assert "vorbereitet" in res.text

    def test_any_path_triggers_a_start_not_just_the_root(self, world):
        """nginx forwards the original URI — the browser may have been asking
        for a stylesheet when it hit the 502."""
        client, _, started = world

        client.get("/_anki/js/reviewer.js", headers={USER_HEADER: "alex"})

        assert started == ["alex"]

    def test_a_missing_username_header_is_a_server_fault_not_a_start(self, world):
        """Only nginx talks to this service. No header means it is
        misconfigured, not that a user did something."""
        client, _, started = world

        res = client.get("/")

        assert res.status_code == 503
        assert started == []
        assert "Fehler auf dem Server" in res.text

    def test_a_second_request_while_it_is_up_does_not_start_it_twice(self, world):
        client, _, started = world

        client.get("/", headers={USER_HEADER: "alex"})
        client.get("/", headers={USER_HEADER: "alex"})

        assert started == ["alex"]

    def test_the_wait_page_reloads_itself_and_still_works_without_js(self, world):
        """The poll is what makes the session open the moment it is ready. The
        meta-refresh is the fallback, and it must be behind <noscript> — running
        both would have the refresh yank the page out from under the poll."""
        client, _, _ = world

        res = client.get("/", headers={USER_HEADER: "alex"})

        assert "fetch(location.href" in res.text
        assert '<noscript><meta http-equiv="refresh"' in res.text

    def test_the_wait_page_is_readable_on_a_phone(self, world):
        """No viewport meta means a phone lays it out at 980px and zooms out."""
        client, _, _ = world

        res = client.get("/", headers={USER_HEADER: "alex"})

        assert 'name="viewport"' in res.text

    def test_a_dead_end_offers_a_button_because_nothing_will_retry_for_you(self, world):
        client, registry, _ = world

        async def broken(_username):
            raise InstanceError("did not start")

        registry.ensure = broken
        res = client.get("/", headers={USER_HEADER: "alex"})

        assert "location.reload()" in res.text
        assert "fetch(location.href" not in res.text

    def test_a_full_house_says_so_and_does_not_auto_refresh(self, world):
        client, registry, _ = world

        async def full(_username):
            raise CapacityError("all study sessions are in use")

        registry.ensure = full
        res = client.get("/", headers={USER_HEADER: "alex"})

        assert res.status_code == 503
        assert "ausgelastet" in res.text
        # Refreshing every 2s against a full server would just add load.
        assert 'http-equiv="refresh"' not in res.text

    def test_a_broken_instance_reports_a_server_fault(self, world):
        client, registry, _ = world

        async def broken(_username):
            raise InstanceError("did not start")

        registry.ensure = broken
        res = client.get("/", headers={USER_HEADER: "alex"})

        assert res.status_code == 503
        assert "Fehler auf dem Server" in res.text

    def test_an_unexpected_error_still_renders_a_page(self, world):
        """A traceback reaching the browser as a 500 would be both ugly and
        more informative than it should be."""
        client, registry, _ = world

        async def boom(_username):
            raise RuntimeError("something unforeseen")

        registry.ensure = boom
        res = client.get("/", headers={USER_HEADER: "alex"})

        assert res.status_code == 503
        assert "Fehler auf dem Server" in res.text

    def test_a_path_shaped_username_is_refused(self, world):
        """The header is trusted from nginx, but a hostile value must not
        become a socket path outside the socket directory."""
        client, _, started = world

        res = client.get("/", headers={USER_HEADER: "../../etc/passwd"})

        assert res.status_code == 503
        assert started == []
