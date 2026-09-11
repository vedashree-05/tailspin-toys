import { asc, count, eq } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

export interface GameFilters {
    categories?: string[];
    publisher?: string | null;
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

export interface PaginatedGames {
    games: Game[];
    page: number;
    pageSize: number;
    totalGames: number;
    totalPages: number;
}

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

type NormalizedGameFilters = {
    categories: string[];
    publisher: string | null;
};

function normalizeFilters(filters: GameFilters = {}): NormalizedGameFilters {
    const categoriesList = Array.from(
        new Set((filters.categories ?? []).map((name) => name.trim()).filter(Boolean)),
    );

    return {
        categories: categoriesList,
        publisher: filters.publisher?.trim() || null,
    };
}

/** All game categories ordered alphabetically. */
export async function getAllCategories(db: Database): Promise<string[]> {
    const rows = await db
        .selectDistinct({ name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));
    return rows.map((row) => row.name);
}

/** All publishers ordered alphabetically. */
export async function getAllPublishers(db: Database): Promise<string[]> {
    const rows = await db
        .selectDistinct({ name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
    return rows.map((row) => row.name);
}

/** All games ordered by title, optionally restricted by category and/or publisher filters. */
export async function filterGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    const normalized = normalizeFilters(filters);
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    const mapped = rows.map(mapGame);

    return mapped.filter((game) => {
        const categoryMatches =
            normalized.categories.length === 0 || normalized.categories.includes(game.category?.name ?? '');
        const publisherMatches = !normalized.publisher || game.publisher?.name === normalized.publisher;
        return categoryMatches && publisherMatches;
    });
}

/** All games ordered by title. */
export async function getAllGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    return filterGames(db, filters);
}

/** Games matching one or more category names. */
export async function getGamesByCategory(db: Database, category: string | string[]): Promise<Game[]> {
    const categoriesList = Array.isArray(category) ? category : [category];
    return filterGames(db, { categories: categoriesList });
}

/** Games published by the selected publisher. */
export async function getGamesByPublisher(db: Database, publisher: string): Promise<Game[]> {
    return filterGames(db, { publisher });
}

/** A stable, title-ordered page of games and its collection metadata. */
export async function getGamesPage(
    db: Database,
    page: number,
    pageSize: number,
): Promise<PaginatedGames> {
    if (!Number.isInteger(page) || page < 1) {
        throw new RangeError('Page must be a positive integer.');
    }

    if (!Number.isInteger(pageSize) || pageSize < 1) {
        throw new RangeError('Page size must be a positive integer.');
    }

    const [{ totalGames }] = await db
        .select({ totalGames: count(games.id) })
        .from(games);
    const totalPages = Math.ceil(totalGames / pageSize);
    const rows = await baseGamesQuery(db)
        .orderBy(asc(games.title))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

    return {
        games: rows.map(mapGame),
        page,
        pageSize,
        totalGames,
        totalPages,
    };
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    const row = rows.find((candidate) => candidate.id === id);
    return row ? mapGame(row) : null;
}
