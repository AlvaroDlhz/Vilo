export interface NavLink {
  label: string;
  href: string;
}

export interface ComponentProps {
  className?: string;
  id?: string;
  [key: string]: string | undefined;
}

export type EventCallback = (event: Event) => void;
