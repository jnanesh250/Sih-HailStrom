/**
 * Visually hidden but screen-reader accessible text.
 */
export default function VisuallyHidden({ as: Tag = 'span', children }) {
  return <Tag className="visually-hidden">{children}</Tag>;
}
