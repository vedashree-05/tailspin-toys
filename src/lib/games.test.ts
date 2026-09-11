import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    filterGames,
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesPage,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilteredGames(db: Database): Promise<void> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'strategy' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'puzzle' })
        .returning({ id: categories.id });
    const [pubOne] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub one' })
        .returning({ id: publishers.id });
    const [pubTwo] = await db
        .insert(publishers)
        .values({ name: 'Pub Two', description: 'pub two' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Alpha Quest',
            description: 'Strategy by Pub One',
            starRating: 4.5,
            categoryId: strategy.id,
            publisherId: pubOne.id,
        },
        {
            title: 'Bravo Puzzle',
            description: 'Puzzle by Pub One',
            starRating: 4.0,
            categoryId: puzzle.id,
            publisherId: pubOne.id,
        },
        {
            title: 'Charlie Strategy',
            description: 'Strategy by Pub Two',
            starRating: 4.2,
            categoryId: strategy.id,
            publisherId: pubTwo.id,
        },
        {
            title: 'Delta Puzzle',
            description: 'Puzzle by Pub Two',
            starRating: 3.8,
            categoryId: puzzle.id,
            publisherId: pubTwo.id,
        },
    ]);
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('returns a title-ordered page with collection metadata', async () => {
        await seedGames(db, 5);

        const result = await getGamesPage(db, 2, 2);

        expect(result.totalGames).toBe(5);
        expect(result.totalPages).toBe(3);
        expect(result.page).toBe(2);
        expect(result.pageSize).toBe(2);
        expect(result.games.map((game) => game.title)).toEqual(['Game 03', 'Game 04']);
    });

    it('returns an empty page when the requested page is past the end', async () => {
        await seedGames(db, 2);

        const result = await getGamesPage(db, 3, 2);

        expect(result.totalPages).toBe(1);
        expect(result.games).toEqual([]);
    });

    it('returns empty metadata for an empty collection', async () => {
        const result = await getGamesPage(db, 1, 6);

        expect(result).toMatchObject({
            games: [],
            page: 1,
            pageSize: 6,
            totalGames: 0,
            totalPages: 0,
        });
    });

    it.each([
        [0, 6],
        [1.5, 6],
        [1, 0],
        [1, 2.5],
    ])('rejects invalid pagination values (%s, %s)', async (page, pageSize) => {
        await expect(getGamesPage(db, page, pageSize)).rejects.toThrow(RangeError);
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by category', async () => {
        await seedFilteredGames(db);

        const results = await filterGames(db, { categories: ['Strategy'] });
        expect(results.map((game) => game.title)).toEqual(['Alpha Quest', 'Charlie Strategy']);
    });

    it('filters games by publisher', async () => {
        await seedFilteredGames(db);

        const results = await filterGames(db, { publisher: 'Pub One' });
        expect(results.map((game) => game.title)).toEqual(['Alpha Quest', 'Bravo Puzzle']);
    });

    it('combines category and publisher filters', async () => {
        await seedFilteredGames(db);

        const results = await filterGames(db, { categories: ['Strategy', 'Puzzle'], publisher: 'Pub One' });
        expect(results.map((game) => game.title)).toEqual(['Alpha Quest', 'Bravo Puzzle']);
    });

    it('returns an empty result set when no games match the filters', async () => {
        await seedFilteredGames(db);

        const noMatches = await filterGames(db, { categories: ['Strategy'], publisher: 'Missing Publisher' });
        expect(noMatches).toEqual([]);
    });
});
