#!/usr/bin/env ts-node-dev

/* eslint-disable indent */

// import { findPublicPages } from "./findPublicPages";
// const publicPages = findPublicPages();

import fs from "fs-extra";
import path from "path";

import { readJsonSync } from "../util";
import { Block, PageWithMetadata } from "../types";

// TODO TS
const pagesWithMeta: PageWithMetadata<{}, {}>[] = readJsonSync(path.join(__dirname, "..", "..", "graphraw.json")); // TODO FIXME

export const pagesWithMetaAndHtml: PageWithMetadata<{}, {}>[] = pagesWithMeta.map((meta) => {
	const { page } = meta;

	const startTime: Date = new Date();
	const lastSignificantUpdate: Date = new Date(page["edit-time"]);

	/**
	 * TODO - we want static html here. is it time for Svelte?!
	 *
	 * -> YES
	 *
	 */

	(meta as any).html = `\
<!DOCTYPE html>
<html>
	<head>
		<title>${page.title} | notes</title>
	</head>

	<body>
		<main>
			<nav>
				<a href="/">/</a>
			</nav>

			<h1>
				${page.title}
			</h1>
			<small>
				<div>
					last edit on:
					<br/>
					${lastSignificantUpdate.toISOString()}.
				</div>

				<div>
					checked, re-generated & exported on:
					<br/>
					${startTime.toISOString()}.
				</div>

				<!--
					TODO dynamic updates "x sec/min/h/day etc. ago" w/ a simple js function + setInterval
				-->
			</small>

			${joinChildren(
				(page.children || []).map((block) => blockRecursively(block, 0)),
				3
			)}
		</main>

		<aside>
			//
		</aside>

		<footer>
			<center>
				exported from <a target="_blank" rel="noopener" href="http://roamresearch.com">roam</a> by <a target="_blank" rel="noopener" href="http://github.com/kiprasmel/roam-traverse-graph">roam-traverse-graph</a>'s plugin <a target="_blank" rel="noopener" href="https://github.com/kiprasmel/roam-traverse-graph/tree/master/plugin-export-public-pages">plugin-export-public-pages</a>.
			</center>
		</footer>
	</body>
</html>`;

	// .replace(/^[\s\t]+/g, "");

	return meta;
});

const prefix = path.join(__dirname, "notes");

fs.rmdirSync(prefix, { recursive: true });
fs.mkdirpSync(prefix);

pagesWithMetaAndHtml.forEach((meta) => {
	let fixedTitle: string = meta.page.title
		.replace(/\(/g, "(") //
		.replace(/\)/g, ")")
		.replace(/\//g, "/_");

	fixedTitle += ".html";

	const fullPath = path.join(prefix, fixedTitle);
	fs.createFileSync(fullPath);
	fs.writeFileSync(fullPath, (meta as any).html);
});

function blockRecursively<M0, M1>(block: Block<M0, M1>, existingTabCount: number): string {
	const childrenHtml: string[] = (block.children || []).map((child) =>
		blockRecursively(child, existingTabCount + 1 + 1)
	);

	return `\
<li>
	<span>
		${block.string}
	</span>

	${joinChildren(childrenHtml, existingTabCount + 1)}
</li>`;
}

function joinChildren(childrenHtml: string[], existingTabCount: number): string {
	return `\
<ul>
	${childrenHtml.join("\n")}
</ul>`
		.split("\n")
		.map((line) => "\n".repeat(existingTabCount) + line)
		.join("\n");
}
