import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installLocalStorageMock, seedLocalStorage, snapshotLocalStorage } from '../test/localStorageMock';
import {
  buildProjectData, isProjectFile, applyProjectData, importProject, type ProjectFile,
} from './projectFile';

const projectFileOf = (data: Record<string, unknown>): ProjectFile => ({
  version: 1,
  savedAt: '2026-01-01T00:00:00.000Z',
  localStorage: Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  ),
});

const asFile = (content: unknown) =>
  new File([typeof content === 'string' ? content : JSON.stringify(content)], 'project.json');

beforeEach(() => { installLocalStorageMock(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('buildProjectData', () => {
  it('собирает только свои ключи, чужие не трогает', () => {
    seedLocalStorage({
      'app:zoom': 1,
      'silyanka:designMap': { 'node-0-0': '#ff0000' },
      'crossWeave:gridSize': { width: 10, height: 10 },
      'some-other-app:token': 'secret',
      'theme': 'dark',
    });

    const data = buildProjectData();

    expect(Object.keys(data.localStorage).sort()).toEqual([
      'app:zoom', 'crossWeave:gridSize', 'silyanka:designMap',
    ]);
  });

  it('пишет версию и время сохранения', () => {
    const data = buildProjectData();
    expect(data.version).toBe(1);
    expect(() => new Date(data.savedAt).toISOString()).not.toThrow();
  });

  it('значения переносятся ровно как лежат в localStorage', () => {
    seedLocalStorage({ 'silyanka:designMap': { 'node-0-0': '#ff0000' } });
    expect(buildProjectData().localStorage['silyanka:designMap'])
      .toBe(JSON.stringify({ 'node-0-0': '#ff0000' }));
  });
});

describe('buildProjectData({ forShare: true })', () => {
  // Прогресс плетения — состояние конкретной работы в руках, а не часть схемы:
  // получатель ссылки не должен открывать чужую схему наполовину затянутой.
  // Список исключений в projectFile.ts живёт отдельно от ключей в
  // useWeaveProgress.ts/App.tsx — тест держит эти два места вместе.
  it('прогресс плетения не уходит по ссылке ни для одной техники', () => {
    seedLocalStorage({
      'silyanka:weavePasses': { 'node-0-0': 2 },
      'silyanka:weaveLastSegment': ['node-0-0'],
      'crossWeave:weavePasses': { 'cell-1-1': 1 },
      'crossWeave:weaveLastSegment': ['cell-1-1'],
      'app:weaveMode': true,
    });

    expect(buildProjectData({ forShare: true }).localStorage).toEqual({});
  });

  it('сама схема и настройки вида в ссылку входят', () => {
    seedLocalStorage({
      'silyanka:designMap': { 'node-0-0': '#ff0000' },
      'silyanka:gridSize': { width: 8, height: 20 },
      'app:weaveTool': 'segment',
      'app:weaveOrientation': 'vertical',
      'silyanka:weavePasses': { 'node-0-0': 2 },
    });

    expect(Object.keys(buildProjectData({ forShare: true }).localStorage).sort()).toEqual([
      'app:weaveOrientation', 'app:weaveTool', 'silyanka:designMap', 'silyanka:gridSize',
    ]);
  });

  it('в файл проекта прогресс, наоборот, входит — это своя же работа', () => {
    seedLocalStorage({ 'silyanka:weavePasses': { 'node-0-0': 2 } });
    expect(buildProjectData().localStorage).toHaveProperty('silyanka:weavePasses');
  });
});

describe('isProjectFile', () => {
  it('принимает корректный файл', () => {
    expect(isProjectFile(projectFileOf({ 'app:zoom': 1 }))).toBe(true);
  });

  it('отвергает чужую версию', () => {
    expect(isProjectFile({ ...projectFileOf({}), version: 2 })).toBe(false);
    expect(isProjectFile({ ...projectFileOf({}), version: '1' })).toBe(false);
  });

  it('отвергает не-объект и отсутствующий localStorage', () => {
    expect(isProjectFile(null)).toBe(false);
    expect(isProjectFile('строка')).toBe(false);
    expect(isProjectFile({ version: 1, savedAt: '' })).toBe(false);
    expect(isProjectFile({ version: 1, savedAt: '', localStorage: null })).toBe(false);
  });

  it('отвергает файл, где значения не строки', () => {
    expect(isProjectFile({ version: 1, savedAt: '', localStorage: { 'app:zoom': 1 } })).toBe(false);
  });
});

describe('applyProjectData', () => {
  it('стирает свои ключи, которых нет в файле', () => {
    seedLocalStorage({
      'silyanka:designMap': { 'node-0-0': '#ff0000' },
      'silyanka:pendantPlacements': [{ id: 'p1' }],
    });

    applyProjectData(projectFileOf({ 'silyanka:designMap': { 'node-1-1': '#00ff00' } }));

    expect(localStorage.getItem('silyanka:pendantPlacements')).toBeNull();
    expect(localStorage.getItem('silyanka:designMap'))
      .toBe(JSON.stringify({ 'node-1-1': '#00ff00' }));
  });

  it('чужие ключи в localStorage остаются нетронутыми', () => {
    seedLocalStorage({ 'some-other-app:token': 'secret', 'app:zoom': 1 });

    applyProjectData(projectFileOf({ 'app:zoom': 2 }));

    expect(localStorage.getItem('some-other-app:token')).toBe('secret');
  });

  // Обход идёт по индексам localStorage.key(i), а удаление сдвигает индексы —
  // если собирать и удалять в одном проходе, часть ключей переживёт загрузку
  // и подмешается к новой схеме.
  it('стирает все свои ключи, сколько бы их ни было', () => {
    seedLocalStorage(Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`silyanka:key${i}`, `value${i}`]),
    ));

    applyProjectData(projectFileOf({ 'silyanka:designMap': {} }));

    expect(Object.keys(snapshotLocalStorage())).toEqual(['silyanka:designMap']);
  });

  it('пустой файл проекта очищает состояние приложения', () => {
    seedLocalStorage({ 'app:zoom': 2, 'silyanka:designMap': { 'node-0-0': '#ff0000' } });
    applyProjectData(projectFileOf({}));
    expect(snapshotLocalStorage()).toEqual({});
  });
});

describe('importProject', () => {
  it('загружает корректный файл', async () => {
    await importProject(asFile(projectFileOf({ 'app:zoom': 2 })));
    expect(localStorage.getItem('app:zoom')).toBe('2');
  });

  it('битый JSON — понятная ошибка, состояние не тронуто', async () => {
    seedLocalStorage({ 'app:zoom': 1 });
    const before = snapshotLocalStorage();

    await expect(importProject(asFile('{ это не json'))).rejects.toThrow(/повреждён/i);
    expect(snapshotLocalStorage()).toEqual(before);
  });

  it('чужая версия — понятная ошибка, состояние не тронуто', async () => {
    seedLocalStorage({ 'app:zoom': 1 });
    const before = snapshotLocalStorage();

    await expect(importProject(asFile({ ...projectFileOf({}), version: 99 })))
      .rejects.toThrow(/не файл проекта silyanka|версия/i);
    expect(snapshotLocalStorage()).toEqual(before);
  });

  it('валидный JSON, но не файл проекта — состояние не тронуто', async () => {
    seedLocalStorage({ 'app:zoom': 1 });
    const before = snapshotLocalStorage();

    await expect(importProject(asFile({ hello: 'world' }))).rejects.toThrow();
    expect(snapshotLocalStorage()).toEqual(before);
  });
});
