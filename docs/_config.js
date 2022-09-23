import lume from "https://deno.land/x/lume@v1.11.1/mod.js";

const site = lume();

site.copy("logo-v2.svg");
site.copy("styles.css");
site.copy("markdown.css");
site.copy("monaco-editor");

// from https://github.com/lumeland/lumeland.github.io/blob/aa199c82d7bac41c16c1cb87151de63a12f1b667/_config.js
site.preprocess([".html"], (page) => {
  page.data.sourceFile = page.src.path + page.src.ext;
});

export default site;
