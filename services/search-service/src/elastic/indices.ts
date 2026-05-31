import { esClient } from './client.js';

export const INDICES = {
  STORES:     'halalgo_stores',
  MENU_ITEMS: 'halalgo_menu_items',
} as const;

export async function setupIndices(): Promise<void> {
  const storesExists = await esClient.indices.exists({ index: INDICES.STORES });
  if (!storesExists) {
    await esClient.indices.create({
      index: INDICES.STORES,
      mappings: {
        properties: {
          id:              { type: 'keyword' },
          name:            { type: 'text', analyzer: 'standard' },
          description:     { type: 'text', analyzer: 'standard' },
          cuisineType:     { type: 'keyword' },
          storeType:       { type: 'keyword' },
          isOpen:          { type: 'boolean' },
          isVerified:      { type: 'boolean' },
          rating:          { type: 'float' },
          deliveryFee:     { type: 'float' },
          deliveryTimeMin: { type: 'integer' },
          city:            { type: 'keyword' },
          province:        { type: 'keyword' },
          location:        { type: 'geo_point' },
        },
      },
    });
    console.log(`Created index: ${INDICES.STORES}`);
  }

  const menuExists = await esClient.indices.exists({ index: INDICES.MENU_ITEMS });
  if (!menuExists) {
    await esClient.indices.create({
      index: INDICES.MENU_ITEMS,
      mappings: {
        properties: {
          id:          { type: 'keyword' },
          storeId:     { type: 'keyword' },
          name:        { type: 'text', analyzer: 'standard' },
          description: { type: 'text', analyzer: 'standard' },
          basePrice:   { type: 'float' },
          isAvailable: { type: 'boolean' },
          allergens:   { type: 'keyword' },
          storeType:   { type: 'keyword' },
        },
      },
    });
    console.log(`Created index: ${INDICES.MENU_ITEMS}`);
  }
}

if (process.argv[1]?.endsWith('indices.ts') || process.argv[1]?.endsWith('indices.js')) {
  setupIndices().catch(console.error);
}
