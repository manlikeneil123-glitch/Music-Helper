// Run: node test.js — checks the no-repeat draw and the topic bank.
const assert = require('assert');
const { drawTopic } = require('./app.js');
global.window = {};
require('./topics.js');

const pool = ['a', 'b', 'c'], seen = new Set();
const got = [0, 1, 2].map(() => drawTopic(pool, seen).topic);
assert.deepStrictEqual([...got].sort(), pool, 'every topic once before any repeat');
const r = drawTopic(pool, seen);
assert.ok(r.reshuffled && seen.size === 1, 'reshuffles only after the deck is used up');

const other = new Set(['x', 'a']);
drawTopic(['a'], other);
assert.ok(other.has('x'), 'reshuffling one deck keeps other decks\' history');

const all = Object.values(window.TOPICS).flat();
assert.ok(new Set(all).size >= 1500, `only ${new Set(all).size} unique topics`);
console.log('ok:', new Set(all).size, 'unique topics');
