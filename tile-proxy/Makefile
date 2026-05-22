BIN := tile-proxy

.PHONY: build run regions clean

# Build release binary and drop it in ./ (next to this Makefile).
build:
	cargo build --release
	cp target/release/$(BIN) ./$(BIN)

# Build, then run (override the port with TILE_PROXY_ADDR=...).
run: build
	./$(BIN)

# Regenerate the swisstopo-region polygons CH + LI (src/regions.in).
regions:
	node scripts/gen-regions.mjs

clean:
	cargo clean
	rm -f ./$(BIN)
