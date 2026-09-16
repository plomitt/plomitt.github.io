export function cosine(a, b) {
    if (a.length !== b.length) throw new Error(`vector length mismatch: ${a.length} vs ${b.length}`);
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) throw new Error('cannot rank a zero-length vector');
    return dot / Math.sqrt(na * nb);
}

export function rank(queryVector, chunks, { topK = 3, minScore = 0.22 } = {}) {
    return chunks
        .map(chunk => ({ chunk, score: cosine(queryVector, chunk.vector) }))
        .filter(hit => hit.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

// Filler words
const STOPWORDS = new Set(('a an the and or but of for in on at to from by with without about as is are was were be been being do does did done have has had can could will would should may might must ' +
    'he she they it his her him them their you your yours my me mine we us our i this that these those what which who whom whose when where why how any some all both each few more most other such no nor not only own same so than too very just also then there here tell show me know any').split(' '));

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Lexical fallback for terms the embedding model has never seen
export function keywordRank(query, chunks, { topK = 3 } = {}) {
    const terms = [...new Set((query.toLowerCase().match(/[a-z0-9][a-z0-9+#.]*/g) ?? []))]
        .map((t) => t.replace(/\.+$/, ''))
        .filter((t) => t.length > 1 && !STOPWORDS.has(t));

    if (terms.length === 0) return [];

    const patterns = terms.map((t) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(t)}(?![a-z0-9])`, 'i'));

    return chunks
        .map((chunk) => ({ chunk, score: patterns.filter((p) => p.test(chunk.text)).length }))
        .filter((hit) => hit.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}
