import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { cn } from '../../../../lib/cn';
import { isSafeHref, type RichDoc } from '../../model/richText';

export interface RichTextEditorHandle {
  focus: () => void;
}

interface RichTextEditorProps {
  initialContent: RichDoc | null;
  /** The document, and its plain text for counting. */
  onChange: (content: RichDoc, text: string) => void;
  labelId: string;
  describedBy?: string | undefined;
  invalid?: boolean;
  placeholder: string;
  /** Ctrl/⌘ + Enter. */
  onSubmitShortcut?: () => void;
  ref?: Ref<RichTextEditorHandle>;
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = IS_MAC ? '⌘' : 'Ctrl';

/**
 * The blog body editor (TipTap). Only the formatting the server accepts is
 * available: bold, italic, underline, strikethrough, two heading levels,
 * lists, quotes and http(s) links. Pasted content is reduced to the same set.
 * Loaded on demand, so the editor's code only downloads when someone writes.
 */
export function RichTextEditor({
  initialContent,
  onChange,
  labelId,
  describedBy,
  invalid = false,
  placeholder,
  onSubmitShortcut,
  ref,
}: RichTextEditorProps) {
  // The editor's key handler is created once; read the latest callback through a ref.
  const submit = useRef(onSubmitShortcut);
  useEffect(() => {
    submit.current = onSubmitShortcut;
  }, [onSubmitShortcut]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          isAllowedUri: (url) => isSafeHref(url),
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent ?? '',
    editorProps: {
      attributes: {
        class: 'rich-text rich-text-editor min-h-72 px-4 py-4 text-lg outline-none',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelId,
        ...(describedBy && { 'aria-describedby': describedBy }),
        ...(invalid && { 'aria-invalid': 'true' }),
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && submit.current) {
          event.preventDefault();
          submit.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      // getJSON is loosely typed; the server sanitizes it against the allow-list.
      onChange(e.getJSON() as RichDoc, e.getText({ blockSeparator: '\n\n' }));
    },
  });

  useImperativeHandle(ref, () => ({ focus: () => editor.commands.focus() }), [editor]);

  return (
    <div
      className={cn(
        'border bg-surface transition-colors focus-within:border-text',
        invalid ? 'border-danger' : 'border-border-strong',
      )}
    >
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

/* ----------------------------------------------------------------- toolbar */

interface ToolSpec {
  label: string;
  shortcut?: string;
  icon: ReactNode;
  isActive?: (e: Editor) => boolean;
  run: (e: Editor) => void;
  disabled?: (e: Editor) => boolean;
}

const GROUPS: ToolSpec[][] = [
  [
    {
      label: 'Bold',
      shortcut: `${MOD}+B`,
      icon: <span className="font-bold">B</span>,
      isActive: (e) => e.isActive('bold'),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      shortcut: `${MOD}+I`,
      icon: <span className="font-display italic">I</span>,
      isActive: (e) => e.isActive('italic'),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Underline',
      shortcut: `${MOD}+U`,
      icon: <span className="underline underline-offset-2">U</span>,
      isActive: (e) => e.isActive('underline'),
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Strikethrough',
      shortcut: `${MOD}+Shift+S`,
      icon: <span className="line-through">S</span>,
      isActive: (e) => e.isActive('strike'),
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
  ],
  [
    {
      label: 'Heading',
      shortcut: `${MOD}+Alt+2`,
      icon: <span className="text-xs font-semibold">H2</span>,
      isActive: (e) => e.isActive('heading', { level: 2 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Subheading',
      shortcut: `${MOD}+Alt+3`,
      icon: <span className="text-xs font-semibold">H3</span>,
      isActive: (e) => e.isActive('heading', { level: 3 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: 'Bulleted list',
      shortcut: `${MOD}+Shift+8`,
      icon: <BulletListIcon />,
      isActive: (e) => e.isActive('bulletList'),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      shortcut: `${MOD}+Shift+7`,
      icon: <NumberedListIcon />,
      isActive: (e) => e.isActive('orderedList'),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Quote',
      shortcut: `${MOD}+Shift+B`,
      icon: <QuoteIcon />,
      isActive: (e) => e.isActive('blockquote'),
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      label: 'Link',
      icon: <LinkIcon />,
      isActive: (e) => e.isActive('link'),
      run: (e) => {
        editLink(e);
      },
    },
  ],
  [
    {
      label: 'Undo',
      shortcut: `${MOD}+Z`,
      icon: <UndoIcon />,
      run: (e) => e.chain().focus().undo().run(),
      disabled: (e) => !e.can().undo(),
    },
    {
      label: 'Redo',
      shortcut: IS_MAC ? '⌘+Shift+Z' : 'Ctrl+Y',
      icon: <UndoIcon className="-scale-x-100" />,
      run: (e) => e.chain().focus().redo().run(),
      disabled: (e) => !e.can().redo(),
    },
  ],
];

const TOOLS = GROUPS.flat();
/** Index in TOOLS of each group's first button. */
const GROUP_OFFSETS = GROUPS.map((_, g) =>
  GROUPS.slice(0, g).reduce((n, group) => n + group.length, 0),
);

/** Adds, changes or removes the link on the selection. Only http(s) addresses. */
function editLink(editor: Editor): void {
  const current = (editor.getAttributes('link') as { href?: string }).href ?? '';
  const input = window.prompt(
    'Link address (leave empty to remove the link)',
    current || 'https://',
  );
  if (input === null) return;
  const href = input.trim();
  const chain = editor.chain().focus().extendMarkRange('link');
  if (href === '' || href === 'https://') {
    chain.unsetLink().run();
    return;
  }
  const withProtocol = /^[a-z]+:/i.test(href) ? href : `https://${href}`;
  if (!isSafeHref(withProtocol)) {
    window.alert('Links must start with https:// or http://');
    return;
  }
  chain.setLink({ href: withProtocol }).run();
}

/**
 * ARIA toolbar: one Tab stop, arrow keys move between buttons, Home/End jump.
 * Toggle buttons report their state with aria-pressed.
 */
function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      TOOLS.map((tool) => ({
        active: tool.isActive?.(e) ?? false,
        disabled: tool.disabled?.(e) ?? false,
      })),
  });
  const [focusIndex, setFocusIndex] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = TOOLS.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? focusIndex === last
          ? 0
          : focusIndex + 1
        : event.key === 'ArrowLeft'
          ? focusIndex === 0
            ? last
            : focusIndex - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    buttons.current[next]?.focus();
  };

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      onKeyDown={onKeyDown}
      className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-surface px-2 py-1.5"
    >
      {GROUPS.map((group, g) => (
        <div
          key={g}
          className={cn('flex items-center gap-0.5', g > 0 && 'border-l border-border pl-1')}
        >
          {group.map((tool, t) => {
            const i = (GROUP_OFFSETS[g] ?? 0) + t;
            const { active, disabled } = state[i] ?? { active: false, disabled: false };
            const title = tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label;
            return (
              <button
                key={tool.label}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                tabIndex={i === focusIndex ? 0 : -1}
                onFocus={() => {
                  setFocusIndex(i);
                }}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep the text selection
                }}
                onClick={() => {
                  tool.run(editor);
                }}
                aria-label={tool.label}
                title={title}
                {...(tool.isActive && { 'aria-pressed': active })}
                aria-disabled={disabled || undefined}
                className={cn(
                  'grid size-9 place-items-center text-sm transition-colors',
                  active ? 'bg-primary text-on-primary' : 'text-text hover:bg-bg',
                  disabled && 'opacity-40 hover:bg-transparent',
                )}
              >
                {tool.icon}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- icons */

const iconProps = {
  'aria-hidden': true,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
} as const;

function BulletListIcon() {
  return (
    <svg {...iconProps} className="size-4.5">
      <path d="M8 5h9M8 10h9M8 15h9" />
      <circle cx="4" cy="5" r="1" fill="currentColor" />
      <circle cx="4" cy="10" r="1" fill="currentColor" />
      <circle cx="4" cy="15" r="1" fill="currentColor" />
    </svg>
  );
}

function NumberedListIcon() {
  return (
    <svg {...iconProps} className="size-4.5">
      <path d="M8 5h9M8 10h9M8 15h9" />
      <path d="M3 3.5h1.2v3M3 8.5h1.8L3 11.3h1.9M3 13.5h1.8l-.9 1.3.9 1.4H3" strokeWidth="1.1" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg {...iconProps} className="size-4.5">
      <path d="M4 4v12M8 6h9M8 10h9M8 14h6" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg {...iconProps} className="size-4.5">
      <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2L10 5.8" />
      <path d="M11.5 8.5a3 3 0 0 0-4.2 0L4.7 11.1a3 3 0 0 0 4.2 4.2l1.1-1.1" />
    </svg>
  );
}

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={cn('size-4.5', className)}>
      <path d="M7 5 3.5 8.5 7 12" />
      <path d="M4 8.5h7.5a4.5 4.5 0 0 1 0 9H9" />
    </svg>
  );
}
