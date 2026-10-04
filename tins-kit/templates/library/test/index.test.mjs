import { test } from 'node:test';
import assert from 'node:assert/strict';
import { version } from '../src/index.mjs';

test('AC-1 version() returns the version string', () => assert.equal(version(), '0.1.0'));
