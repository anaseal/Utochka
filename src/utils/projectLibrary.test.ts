import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorageMock, seedLocalStorage } from '../test/localStorageMock';
import { collectKeysWithPrefix } from './projectFile';
import { hasLiveDataChanged, isAutosaveEnabled } from './projectLibrary';

beforeEach(() => { installLocalStorageMock(); });

describe('hasLiveDataChanged', () => {
  it('ничего не изменилось — false', () => {
    seedLocalStorage({ 'silyanka:designMap': { 'node-0-0': '#ff0000' } });
    const data = collectKeysWithPrefix('silyanka:');

    expect(hasLiveDataChanged('silyanka', { data })).toBe(false);
  });

  it('изменилось значение ключа техники — true', () => {
    seedLocalStorage({ 'silyanka:designMap': { 'node-0-0': '#ff0000' } });
    const data = collectKeysWithPrefix('silyanka:');
    seedLocalStorage({ 'silyanka:designMap': { 'node-0-0': '#00ff00' } });

    expect(hasLiveDataChanged('silyanka', { data })).toBe(true);
  });

  it('появился новый ключ техники — true', () => {
    seedLocalStorage({ 'silyanka:designMap': { 'node-0-0': '#ff0000' } });
    const data = collectKeysWithPrefix('silyanka:');
    seedLocalStorage({ 'silyanka:gridSize': { width: 8, height: 20 } });

    expect(hasLiveDataChanged('silyanka', { data })).toBe(true);
  });

  it('ключи чужой техники на dirty-check не влияют', () => {
    seedLocalStorage({ 'silyanka:designMap': { 'node-0-0': '#ff0000' } });
    const data = collectKeysWithPrefix('silyanka:');
    seedLocalStorage({ 'crossWeave:designMap': { 'cell-0-0': '#00ff00' } });

    expect(hasLiveDataChanged('silyanka', { data })).toBe(false);
  });

  it('изменился поворот полотна — true', () => {
    seedLocalStorage({ 'silyanka:designMap': {} });
    const data = collectKeysWithPrefix('silyanka:');
    seedLocalStorage({ 'app:weaveOrientation': { silyanka: 'vertical' } });

    expect(hasLiveDataChanged('silyanka', { data, orientation: undefined })).toBe(true);
  });

  it('изменилось отражение полотна — true', () => {
    seedLocalStorage({ 'silyanka:designMap': {} });
    const data = collectKeysWithPrefix('silyanka:');
    seedLocalStorage({ 'app:weaveFlip': { silyanka: true } });

    expect(hasLiveDataChanged('silyanka', { data, flipped: undefined })).toBe(true);
  });

  it('изменилась палитра — true', () => {
    seedLocalStorage({ 'silyanka:designMap': {}, 'app:palette': ['#ff0000', '#00ff00'] });
    const data = collectKeysWithPrefix('silyanka:');
    seedLocalStorage({ 'app:palette': ['#ff0000', '#0000ff'] });

    expect(hasLiveDataChanged('silyanka', { data, palette: ['#ff0000', '#00ff00'] })).toBe(true);
  });

  it('палитра та же — false', () => {
    seedLocalStorage({ 'silyanka:designMap': {}, 'app:palette': ['#ff0000', '#00ff00'] });
    const data = collectKeysWithPrefix('silyanka:');

    expect(hasLiveDataChanged('silyanka', { data, palette: ['#ff0000', '#00ff00'] })).toBe(false);
  });

  it('у записи палитры нет (старый проект) — на dirty-check не влияет', () => {
    seedLocalStorage({ 'silyanka:designMap': {}, 'app:palette': ['#ff0000'] });
    const data = collectKeysWithPrefix('silyanka:');

    expect(hasLiveDataChanged('silyanka', { data })).toBe(false);
  });
});

describe('isAutosaveEnabled', () => {
  it('поле не задано — выключен по умолчанию', () => {
    expect(isAutosaveEnabled({ autosaveEnabled: undefined })).toBe(false);
  });

  it('явно true — включён', () => {
    expect(isAutosaveEnabled({ autosaveEnabled: true })).toBe(true);
  });

  it('явно false — выключен', () => {
    expect(isAutosaveEnabled({ autosaveEnabled: false })).toBe(false);
  });
});
