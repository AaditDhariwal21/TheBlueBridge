import { useEffect, useRef, type RefObject } from 'react';

/**
 * Calls `onDismiss` when a modal <dialog>'s backdrop is clicked. A backdrop click lands on the
 * <dialog> element itself (its content fills the box). Both the press and the release must be
 * there, so selecting text inside and releasing outside doesn't close it. `enabled` is read at
 * click time, so a dialog that is saving can stay open.
 */
export function useBackdropDismiss(
  ref: RefObject<HTMLDialogElement | null>,
  onDismiss: () => void,
  enabled = true,
): void {
  const latest = useRef({ onDismiss, enabled });
  useEffect(() => {
    latest.current = { onDismiss, enabled };
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let pressedOnBackdrop = false;
    const onPointerDown = (event: PointerEvent) => {
      pressedOnBackdrop = event.target === dialog;
    };
    const onClick = (event: MouseEvent) => {
      if (pressedOnBackdrop && event.target === dialog && latest.current.enabled) {
        latest.current.onDismiss();
      }
      pressedOnBackdrop = false;
    };
    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('click', onClick);
    };
  }, [ref]);
}
