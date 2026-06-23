require('dotenv').config();

const fs = require('node:fs');
const toml = require('@iarna/toml');
const express = require('express');
const path = require('node:path');
const { marked } = require('marked');

const app = express();

function getConfig() {
  const config = toml.parse(fs.readFileSync(path.join(__dirname, "config.toml"), 'utf-8').toString());
  if (!config || !config.page || !config.server) {
    throw new Error("Invalid Configuration file...");
  }
  return config;
}

const pagesDir = path.join(__dirname, "pages");

function getStylesheet(theme) {
  let styles;
  
  const themeFilePath = path.join(__dirname, "themes", `${theme}.css`);

  if (fs.existsSync(themeFilePath)) {
    const themeFile = fs.readFileSync(themeFilePath, 'utf-8');
    styles = themeFile
  } else {
    styles = ""
  }

  return `<style>${styles}</style>`;
}

function getPages() {
  const pagesRaw = fs.readdirSync(pagesDir).filter(page => page.endsWith(".md"));
  const pages = new Map();
  const routes = [];
  for (const page of pagesRaw) {
    if (pages.get(page)) {
      console.warn(`Found duplicate page: ${page}`);
      continue;
    }

    const filename = page.slice(0, -(".md".length));

    switch (filename) {
      case "index":
        routes.push("/");
        pages.set("/", path.join(pagesDir, page));
        break;
      default:
        routes.push(`/${filename}`);
        pages.set(`/${filename}`, path.join(pagesDir, page));
        break;
    }
  }
  return { pages, routes };
}

function main() {
  const config = getConfig();
  const port = process.env.PORT;

  const { pages, routes } = getPages();

  const htmlTemplate = fs.readFileSync(path.join(__dirname, "index.html"), 'utf-8');

  app.get(routes, (req, res, next) => {
    const theme = getConfig().page.theme || "";
    console.log(theme);
    const page = pages.get(req.url);

    const file = fs.readFileSync(page, 'utf-8').split("\n");
    const pageTitle = file.shift();

    const html = htmlTemplate
      .replace("{stylesheet}", getStylesheet(theme))
      .replace("{title}", pageTitle)
      .replace("{content}", marked.parse(file.join("\n")));

    res.send(html);
  });

  app.listen(port, () => {
    console.log(`Application listening on port ${port}`);
  });
}

main();