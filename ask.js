// Semantic search over this page

const TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';
import { rank, keywordRank } from './search.js';

const MODEL = 'Xenova/multi-qa-MiniLM-L6-cos-v1';
const PREVIEW_CHARS = 260;

// Expand single word queries
const expand = (question) =>
    /^\S+$/.test(question) ? `What experience does he have with ${question}?` : question;

const clean = (s) => s.replace(/\s+/g, ' ').trim();

function collectChunks() {
    const chunks = [];
    const add = (el, section, title, subtitle, preview) => {
        const text = `${section}. ${clean(el.textContent)}`;
        if (!title) throw new Error(`page chunk in "${section}" has no heading`);
        if (text.length < 30) return;
        chunks.push({ el, section, title, subtitle, preview, text });
    };

    document.querySelectorAll('.hero-text p').forEach((p) =>
        add(p, 'About', 'Timofei Polivanov', '', clean(p.textContent)));

    document.querySelectorAll('#skills .card').forEach((card) =>
        add(card, 'Skills', clean(card.querySelector('h3').textContent), '', clean(card.querySelector('p').textContent)));

    document.querySelectorAll('.timeline-item').forEach((item) => {
        const section = clean(item.closest('section').querySelector('h2').textContent);
        const org = item.querySelector('h4');
        const dateEl = item.querySelector('.date');
        const meta = dateEl.querySelector('.meta');
        const date = clean([...dateEl.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(' '));
        add(
            item,
            section,
            clean(item.querySelector('h3').textContent),
            [org && clean(org.textContent), date, meta && clean(meta.textContent)].filter(Boolean).join(' · '),
            [...item.querySelectorAll('li')].map((li) => clean(li.textContent)).join(' · '),
        );
    });

    const contact = document.querySelector('#contact');
    add(contact, 'Contact', 'Get in touch', 'Belgrade, Serbia', clean(contact.querySelector('.email-link').textContent) + ' — open to AI / LLM and software engineering roles, remote as a B2B contractor.');

    return chunks;
}

let extractor = null;
let chunks = null;

const embed = async (text) =>
    Array.from((await extractor(text, { pooling: 'mean', normalize: true })).data);

async function ready(setStatus) {
    if (extractor && chunks) return;

    const { pipeline } = await import(TRANSFORMERS);
    extractor = await pipeline('feature-extraction', MODEL, {
        dtype: 'q8',
        progress_callback: (p) => {
            if (p.status === 'progress' && p.file.endsWith('.onnx')) {
                setStatus(`Downloading the model — ${Math.round(p.progress)}% (once, then cached)`);
            }
        },
    });

    setStatus('Reading the page…');
    chunks = collectChunks();
    for (const chunk of chunks) chunk.vector = await embed(chunk.text);
}

function reveal(el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ask-hit-flash');
    setTimeout(() => el.classList.remove('ask-hit-flash'), 2000);
}

function render(results, into) {
    into.replaceChildren();

    if (results.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'ask-empty';
        empty.textContent = 'Nothing on this page covers that. Try asking about my experience, projects, skills, or education.';
        into.append(empty);
        return;
    }

    for (const { chunk } of results) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'ask-hit';
        card.addEventListener('click', () => reveal(chunk.el));

        const label = document.createElement('span');
        label.className = 'ask-hit-section';
        label.textContent = chunk.section;

        const title = document.createElement('h3');
        title.textContent = chunk.title;

        card.append(label, title);

        if (chunk.subtitle) {
            const meta = document.createElement('p');
            meta.className = 'ask-hit-meta';
            meta.textContent = chunk.subtitle;
            card.append(meta);
        }

        if (chunk.preview) {
            const body = document.createElement('p');
            body.textContent = chunk.preview.length > PREVIEW_CHARS
                ? `${chunk.preview.slice(0, PREVIEW_CHARS)}…`
                : chunk.preview;
            card.append(body);
        }
        into.append(card);
    }
}

const form = document.querySelector('#ask-form');
const input = document.querySelector('#ask-input');
const status = document.querySelector('#ask-status');
const results = document.querySelector('#ask-results');
const setStatus = (text) => { status.textContent = text; };

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    form.classList.add('busy');
    results.replaceChildren();
    setStatus('Starting up…');

    try {
        await ready(setStatus);
        setStatus('');
        const hits = rank(await embed(expand(question)), chunks);
        render(hits.length ? hits : keywordRank(question, chunks), results);
    } catch (error) {
        console.error(error);
        setStatus('Could not load the search model in this browser — the full CV is on the page below.');
    } finally {
        form.classList.remove('busy');
    }
});

document.querySelectorAll('.ask-example').forEach((example) => {
    example.addEventListener('click', () => {
        input.value = example.textContent;
        form.requestSubmit();
    });
});
