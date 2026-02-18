import { json, error, type RequestHandler } from '@sveltejs/kit';
import { ToTryRecipe } from '$models/ToTryRecipe';
import { dbConnect } from '$utils/db';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();

  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }

  await dbConnect();

  try {
    const items = await ToTryRecipe.find().sort({ createdAt: -1 }).lean();
    return json(items);
  } catch (e) {
    throw error(500, 'Failed to fetch to-try recipes');
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();

  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }

  const { name, links, notes } = await request.json();

  if (!name?.trim()) {
    throw error(400, 'Name is required');
  }

  if (!Array.isArray(links) || links.length === 0 || !links.some((l: any) => l.url?.trim())) {
    throw error(400, 'At least one link is required');
  }

  await dbConnect();

  try {
    const item = await ToTryRecipe.create({
      name: name.trim(),
      links: links.filter((l: any) => l.url?.trim()),
      notes: notes?.trim() || '',
      addedBy: session.user.nickname
    });
    return json(item, { status: 201 });
  } catch (e) {
    throw error(500, 'Failed to create to-try recipe');
  }
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();

  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }

  const { id, name, links, notes } = await request.json();

  if (!id) {
    throw error(400, 'ID is required');
  }

  if (!name?.trim()) {
    throw error(400, 'Name is required');
  }

  if (!Array.isArray(links) || links.length === 0 || !links.some((l: any) => l.url?.trim())) {
    throw error(400, 'At least one link is required');
  }

  await dbConnect();

  try {
    const item = await ToTryRecipe.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        links: links.filter((l: any) => l.url?.trim()),
        notes: notes?.trim() || ''
      },
      { new: true }
    ).lean();

    if (!item) {
      throw error(404, 'Item not found');
    }

    return json(item);
  } catch (e) {
    if (e instanceof Error && 'status' in e) throw e;
    throw error(500, 'Failed to update to-try recipe');
  }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();

  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }

  const { id } = await request.json();

  if (!id) {
    throw error(400, 'ID is required');
  }

  await dbConnect();

  try {
    await ToTryRecipe.findByIdAndDelete(id);
    return json({ success: true });
  } catch (e) {
    throw error(500, 'Failed to delete to-try recipe');
  }
};
