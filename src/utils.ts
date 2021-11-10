export function markdownTag(s: string) {
  return `[//]: <> (${s})`;
}

export function markdownComment(s: string, tag?: string) {
  let comment = s;
  if (tag) {
    comment = `${markdownTag(tag)}\n${comment}`;
  }

  return comment;
}
