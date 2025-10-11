import type { ParsedFeed, FeedItem } from '../../domain/FeedItem.js';

export class FormatConversionService {
  toRSS(feed: ParsedFeed): string {
    const items = feed.items
      .map((item) => this.generateRSSItem(item))
      .join('\n    ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${this.escapeXml(feed.title)}</title>
    <link>${this.escapeXml(feed.link)}</link>
    <description>${this.escapeXml(feed.description)}</description>
    ${feed.language ? `<language>${this.escapeXml(feed.language)}</language>` : ''}
    ${items}
  </channel>
</rss>`;
  }

  private generateRSSItem(item: FeedItem): string {
    const categories = item.categories
      ? item.categories
          .map((cat) => `<category>${this.escapeXml(cat)}</category>`)
          .join('\n      ')
      : '';

    return `<item>
      <title>${this.escapeXml(item.title)}</title>
      <link>${this.escapeXml(item.link)}</link>
      <description>${this.escapeXml(item.description)}</description>
      ${item.pubDate ? `<pubDate>${this.escapeXml(item.pubDate)}</pubDate>` : ''}
      ${item.author ? `<dc:creator>${this.escapeXml(item.author)}</dc:creator>` : ''}
      ${item.guid ? `<guid>${this.escapeXml(item.guid)}</guid>` : ''}
      ${item.content ? `<content:encoded><![CDATA[${item.content}]]></content:encoded>` : ''}
      ${categories}
      ${item.enclosure ? `<enclosure url="${this.escapeXml(item.enclosure.url)}" type="${this.escapeXml(item.enclosure.type)}" ${item.enclosure.length ? `length="${item.enclosure.length}"` : ''} />` : ''}
    </item>`;
  }

  toAtom(feed: ParsedFeed): string {
    const items = feed.items
      .map((item) => this.generateAtomEntry(item))
      .join('\n  ');

    const updated =
      feed.items.length > 0 ? feed.items[0].pubDate : new Date().toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${this.escapeXml(feed.title)}</title>
  <link href="${this.escapeXml(feed.link)}" rel="alternate"/>
  <subtitle>${this.escapeXml(feed.description)}</subtitle>
  <updated>${this.escapeXml(updated)}</updated>
  <id>${this.escapeXml(feed.link)}</id>
  ${items}
</feed>`;
  }

  private generateAtomEntry(item: FeedItem): string {
    const categories = item.categories
      ? item.categories
          .map((cat) => `<category term="${this.escapeXml(cat)}"/>`)
          .join('\n    ')
      : '';

    return `<entry>
    <title>${this.escapeXml(item.title)}</title>
    <link href="${this.escapeXml(item.link)}" rel="alternate"/>
    <id>${this.escapeXml(item.guid || item.link)}</id>
    ${item.pubDate ? `<published>${this.escapeXml(item.pubDate)}</published>` : ''}
    ${item.pubDate ? `<updated>${this.escapeXml(item.pubDate)}</updated>` : ''}
    ${item.author ? `<author><name>${this.escapeXml(item.author)}</name></author>` : ''}
    <summary>${this.escapeXml(item.description)}</summary>
    ${item.content ? `<content type="html"><![CDATA[${item.content}]]></content>` : ''}
    ${categories}
    ${item.enclosure ? `<link href="${this.escapeXml(item.enclosure.url)}" rel="enclosure" type="${this.escapeXml(item.enclosure.type)}" ${item.enclosure.length ? `length="${item.enclosure.length}"` : ''} />` : ''}
  </entry>`;
  }

  toJSON(feed: ParsedFeed): string {
    const jsonFeed = {
      version: 'https://jsonfeed.org/version/1.1',
      title: feed.title,
      home_page_url: feed.link,
      description: feed.description,
      language: feed.language,
      items: feed.items.map((item) => ({
        id: item.guid || item.link,
        url: item.link,
        title: item.title,
        content_html: item.content || item.description,
        summary: item.description,
        date_published: item.pubDate,
        authors: item.author ? [{ name: item.author }] : undefined,
        tags: item.categories,
        attachments: item.enclosure
          ? [
              {
                url: item.enclosure.url,
                mime_type: item.enclosure.type,
                size_in_bytes: item.enclosure.length
                  ? parseInt(item.enclosure.length)
                  : undefined,
              },
            ]
          : undefined,
      })),
    };

    return JSON.stringify(jsonFeed, null, 2);
  }

  private escapeXml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
