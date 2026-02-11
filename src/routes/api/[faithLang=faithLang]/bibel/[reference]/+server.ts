import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lookupReference } from '$lib/server/bible';
import { resolve } from 'path';

const tsvFiles: Record<string, string> = {
  glaube: 'static/allioli.tsv',
  faith: 'static/drb.tsv'
};

export const GET: RequestHandler = async ({ params }) => {
  const reference = params.reference;

  if (!reference) {
    return error(400, 'Missing reference parameter');
  }

  const tsvPath = resolve(tsvFiles[params.faithLang]);

  try {
    const result = lookupReference(reference, tsvPath);

    if (!result) {
      return error(404, 'No verses found for the given reference');
    }

    return json(result);
  } catch (err) {
    console.error('Error fetching Bible verses:', err);
    return error(500, 'Failed to fetch Bible verses');
  }
};
