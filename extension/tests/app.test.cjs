'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function loadApp(fetchImpl = async () => { throw new Error('unexpected network request'); }) {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, {
          innerHTML: '', textContent: '', className: 'hidden', scrollTop: 0,
          addEventListener() {}, classList: { toggle() {} },
        });
      }
      return elements.get(id);
    },
    querySelectorAll() { return []; },
  };
  const context = vm.createContext({
    document, fetch: fetchImpl, console, TextEncoder, TextDecoder, Uint8Array,
    Date, URL, Set, Number, Array, Promise,
    localStorage: { getItem() { return null; }, setItem() {} },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'), context, {
    filename: 'app.js',
  });
  return context;
}

const baseQuestion = {
  question: 'What does Quick Sort use to partition an array?',
  options: ['A pivot', 'A hash', 'A queue', 'A heap'],
  answerIndex: 0,
  explanation: 'Quick Sort chooses a pivot before partitioning.',
  sourceTitle: 'Week 1',
};

test('accepts a properly sourced and structured quiz', () => {
  const context = loadApp();
  context.payload = { questions: [baseQuestion] };
  const questions = vm.runInContext("validateQuizResponse(payload, ['Week 1'], 5)", context);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].answerIndex, 0);
});

test('rejects source titles that were not selected by the user', () => {
  const context = loadApp();
  context.payload = { questions: [{ ...baseQuestion, sourceTitle: 'Unknown source' }] };
  assert.throws(() => vm.runInContext("validateQuizResponse(payload, ['Week 1'], 5)", context), /malformed or uncited/);
});

test('rejects invalid options and out-of-range correct answers', () => {
  const context = loadApp();
  for (const bad of [
    { ...baseQuestion, options: ['A pivot', 'A pivot', 'A queue', 'A heap'] },
    { ...baseQuestion, answerIndex: 4 },
    { ...baseQuestion, options: ['A pivot'] },
  ]) {
    context.payload = { questions: [bad] };
    assert.throws(() => vm.runInContext("validateQuizResponse(payload, ['Week 1'], 5)", context), /malformed or uncited/);
  }
});

test('removes repeated question text without losing the valid answer', () => {
  const context = loadApp();
  context.payload = { questions: [
    baseQuestion,
    { ...baseQuestion, question: '  WHAT DOES QUICK SORT USE TO PARTITION AN ARRAY?  ' },
  ] };
  const result = vm.runInContext("validateQuizResponse(payload, ['Week 1'], 5)", context);
  assert.equal(result.length, 1);
});

test('prevents silently truncating courses past the page safety limit', async () => {
  let requests = 0;
  const context = loadApp(async () => ({
    ok: true,
    async json() {
      requests += 1;
      return { items: [{ id: requests }], nextPageToken: 'more' };
    },
  }));
  await assert.rejects(
    vm.runInContext("paged('https://classroom.googleapis.com/v1/courses?pageSize=100', 'items', 'fake-token')", context),
    /more Classroom pages/,
  );
  assert.equal(requests, 50);
});

test('an unsupported attachment does not consume a valid file slot', async () => {
  const context = loadApp();
  vm.runInContext(
    "googleToken=async()=> 'fake-token'; loadDriveFile=async file => file.id==='unsupported'?{skipped:'unsupported'}:{name:file.id,mimeType:'text/plain',text:'Lesson body'};",
    context,
  );
  context.sample = [{
    title: 'Week 1',
    description: '',
    materials: [
      { driveFile: { driveFile: { id: 'unsupported' } } },
      ...Array.from({ length: 13 }, (_, i) => ({ driveFile: { driveFile: { id: 'file-' + i } } })),
    ],
  }];
  const result = await vm.runInContext('sourceData(sample)', context);
  assert.equal(result.sources[0].files.length, 12);
  assert.equal(result.skipped.length, 2);
});
