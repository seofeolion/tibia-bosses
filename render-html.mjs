import fs from 'node:fs/promises';
import { escape as escapeHtml } from 'lodash-es';
import { minify as minifyHtml } from 'html-minifier-terser';

const slugify = (name) => {
	// Deal with lowercase names, e.g. `'midnight panther'`.
	if (/^\p{Lowercase}/u.test(name)) {
		name = name.replaceAll(/\b\p{Lowercase}/gu, (firstLetter) => firstLetter.toUpperCase());
	}
	const underscored = name
		.replaceAll(' ', '_')
		.replaceAll('_The_', '_the_')
		.replaceAll('_Of_', '_of_');
	const encoded = encodeURIComponent(underscored);
	return encoded;
};

const formatNumber = (number) => {
	return `${number.toFixed(2)}%`;
};

const render = (data) => {
	const checkOutput = ['<h2>Bosses to check</h2><div class="table-wrapper"><table><thead><tr><th>Boss<th>Confidence<tbody>'];
	const killedOutput = ['<h2>Recently killed bosses</h2><div class="table-wrapper"><table><thead><tr><th>Boss<th>Confidence<tbody>'];
	let includeCheckOutput = false;
	let includeKilledOutput = false;
	for (const boss of data.bosses) {
		const wikiSlug = slugify(boss.name);
		const imageSlug = wikiSlug
			.toLowerCase()
			.replaceAll('_', '-')
			.replaceAll('\'', '')
			.replaceAll('.', '');
		const niceName = boss.name
			.replaceAll(' The ', ' the ')
			.replaceAll(' Of ', ' of ');
		if (boss.killed) {
			includeKilledOutput = true;
			killedOutput.push(`<tr><td><a href="https://tibia.fandom.com/wiki/${wikiSlug}"><img src="_img/${imageSlug}.webp" width="64" height="64" decoding="async" alt=""> ${escapeHtml(niceName)} (killed)</a><td><s>${boss.chance ? formatNumber(boss.chance) : '?'}</s>`);
			continue;
		}
		includeCheckOutput = true;
		checkOutput.push(`<tr><td><a href="https://tibia.fandom.com/wiki/${wikiSlug}"><img src="_img/${imageSlug}.webp" width="64" height="64" decoding="async" alt=""> ${escapeHtml(niceName)}</a><td>${formatNumber(boss.chance)}`);
	}
	checkOutput.push('</table></div>');
	killedOutput.push('</table></div>');
	const output = [
		includeKilledOutput ? killedOutput.join('') : '',
		includeCheckOutput ? checkOutput.join('') : '',
		`<p>Last updated on <time>${escapeHtml(data.timestamp)}</time>.`,
	];
	const html = output.join('');
	return html;
};

const world = process.argv[2] ?? 'Vunira';
const worldSlug = world.toLowerCase();
const json = await fs.readFile(`./data/${worldSlug}/latest.json`, 'utf8');
const data = JSON.parse(json);

const htmlTemplate = await fs.readFile('./templates/index.html', 'utf8');
const html = htmlTemplate.toString()
	.replaceAll('%%%WORLD%%%', world)
	.replace('%%%DATA%%%', render(data));
const minifiedHtml = await minifyHtml(html, {
	collapseBooleanAttributes: true,
	collapseInlineTagWhitespace: false,
	collapseWhitespace: true,
	conservativeCollapse: false,
	decodeEntities: true,
	html5: true,
	includeAutoGeneratedTags: false,
	minifyCSS: true,
	minifyJS: true,
	preserveLineBreaks: false,
	preventAttributesEscaping: true,
	removeAttributeQuotes: true,
	removeComments: true,
	removeEmptyAttributes: true,
	removeEmptyElements: false,
	removeOptionalTags: false,
	removeRedundantAttributes: true,
	removeTagWhitespace: false,
	sortAttributes: true,
	sortClassName: true,
});
await fs.writeFile(`./dist/${worldSlug}.html`, minifiedHtml);
