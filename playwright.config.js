import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests', timeout:60000, testIgnore:process.env.CAPTURES?[]:['**/captures.spec.js'], fullyParallel:true, reporter:[['list']],
  use:{browserName:'chromium',viewport:{width:1280,height:900},locale:'fr-FR',timezoneId:'Europe/Paris'}
});
