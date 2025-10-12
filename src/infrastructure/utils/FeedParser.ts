import { XMLParser } from 'fast-xml-parser';
import type { ParsedFeed, FeedItem } from '../../domain/FeedItem.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XmlNode = any;

export class FeedParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
  }

  parse(xmlContent: string): ParsedFeed {
    const result = this.parser.parse(xmlContent);

    if (result.rss) {
      return this.parseRSS(result.rss);
    } else if (result.feed) {
      return this.parseAtom(result.feed);
    }

    throw new Error('Unsupported feed format');
  }

  console.log('asd');


  private parseRSS(rss: XmlNode): ParsedFeed {
    const channel = rss.channel;
    const items = Array.isArray(channel.item)
      ? channel.item
      : [channel.item || []];

    return {
      title: channel.title || '',
      description: channel.description || '',
      link: channel.link || '',
      language: channel.language,
      feedType: 'rss',
      items: items
        .filter((item: XmlNode) => item && item.title)
        .map((item: XmlNode) => this.parseRSSItem(item)),
    };
  }

  private parseRSSItem(item: XmlNode): FeedItem {
    const categories = item.category
      ? Array.isArray(item.category)
        ? item.category
        : [item.category]
      : [];

    return {
      title: item.title || '',
      link: item.link || '',
      description: item.description || '',
      pubDate: item.pubDate || item.pubdate || '',
      author: item.author || item['dc:creator'] || item.creator,
      categories: categories.map((cat: XmlNode) =>
        typeof cat === 'string' ? cat : cat['#text'] || ''
      ),
      guid: item.guid?.['#text'] || item.guid || '',
      content:
        item['content:encoded'] || item.content || item.description || '',
      enclosure: item.enclosure
        ? {
            url: item.enclosure['@_url'] || '',
            type: item.enclosure['@_type'] || '',
            length: item.enclosure['@_length'],
          }
        : undefined,
    };
  }

  private parseAtom(feed: XmlNode): ParsedFeed {
    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry || []];

    return {
      title: this.getAtomText(feed.title),
      description: this.getAtomText(feed.subtitle) || '',
      link: this.getAtomLink(feed.link),
      language: feed['@_xml:lang'],
      feedType: 'atom',
      items: entries
        .filter((entry: XmlNode) => entry && entry.title)
        .map((entry: XmlNode) => this.parseAtomEntry(entry)),
    };
  }

  private parseAtomEntry(entry: XmlNode): FeedItem {
    const categories = entry.category
      ? Array.isArray(entry.category)
        ? entry.category.map((cat: XmlNode) => cat['@_term'] || '')
        : [entry.category['@_term'] || '']
      : [];

    return {
      title: this.getAtomText(entry.title),
      link: this.getAtomLink(entry.link),
      description: this.getAtomText(entry.summary) || '',
      pubDate: entry.published || entry.updated || '',
      author: entry.author?.name || '',
      categories,
      guid: entry.id || '',
      content:
        this.getAtomText(entry.content) ||
        this.getAtomText(entry.summary) ||
        '',
      enclosure: entry.link ? this.getAtomEnclosure(entry.link) : undefined,
    };
  }

  private getAtomText(field: XmlNode): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (field['#text']) return field['#text'];
    return '';
  }

  private getAtomLink(link: XmlNode): string {
    if (!link) return '';
    if (typeof link === 'string') return link;
    if (Array.isArray(link)) {
      const altLink = link.find((l: XmlNode) => l['@_rel'] === 'alternate');
      return altLink?.['@_href'] || link[0]?.['@_href'] || '';
    }
    return link['@_href'] || '';
  }

  private getAtomEnclosure(
    link: XmlNode
  ): { url: string; type: string; length?: string } | undefined {
    if (!link) return undefined;

    const links = Array.isArray(link) ? link : [link];
    const enclosure = links.find((l: XmlNode) => l['@_rel'] === 'enclosure');

    if (enclosure) {
      return {
        url: enclosure['@_href'] || '',
        type: enclosure['@_type'] || '',
        length: enclosure['@_length'],
      };
    }

    return undefined;
  }
}
