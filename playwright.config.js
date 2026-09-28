import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests', timeout:60000, fullyParallel:true, reporter:[['list']],
  use:{browserName:'chromium',viewport:{width:1280,height:900},locale:'fr-FR',timezoneId:'Europe/Paris'}
});
