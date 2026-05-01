import { useEffect } from 'react';

const OPEN = '/hand-instructions/open-hand.png';
const OK = '/hand-instructions/ok-hand.png';
const FIST = '/hand-instructions/fist-hand.png';

type Props = {
  onBegin: () => void;
  /** Escape / backdrop: close instructions and turn off Fun Way / camera. */
  onDismiss?: () => void;
};

export function HandInstructionsModal({ onBegin, onDismiss }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) {
        return;
      }
      e.preventDefault();
      onDismiss?.();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [onDismiss]);

  return (
    <div
      className="hand-instructions-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hand-instructions-title"
    >
      <div
        className="hand-instructions-modal__card"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <h2 id="hand-instructions-title" className="hand-instructions-modal__title">
          Instructions:
        </h2>

        <p className="hand-instructions-modal__body">
          Keep hand open at all time when moving. Make sure your hand is in the view of the camera
          and be careful of showing other hands. It may confuse the hand tracker.
        </p>

        <div className="hand-instructions-modal__sub-row">
          <h3 className="hand-instructions-modal__sub">To Click:</h3>
          <h3 className="hand-instructions-modal__sub">To go Back:</h3>
        </div>

        <div className="hand-instructions-modal__columns">
          <div className="hand-instructions-modal__col">
            <div className="hand-instructions-modal__gesture-well">
              <div className="hand-instructions-modal__gesture" aria-hidden="true">
                <img src={OPEN} alt="" className="hand-instructions-modal__img hand-instructions-modal__img--click-a" />
                <img src={OK} alt="" className="hand-instructions-modal__img hand-instructions-modal__img--click-b" />
              </div>
            </div>
            <p className="hand-instructions-modal__gesture-sub">
              Keep all fingers up then tap and release index finger and thumb to click once.
            </p>
          </div>
          <div className="hand-instructions-modal__col">
            <div className="hand-instructions-modal__gesture-well">
              <div className="hand-instructions-modal__gesture" aria-hidden="true">
                <img src={OPEN} alt="" className="hand-instructions-modal__img hand-instructions-modal__img--back-a" />
                <img
                  src={FIST}
                  alt=""
                  className="hand-instructions-modal__img hand-instructions-modal__img--fist-mirror hand-instructions-modal__img--back-b"
                />
              </div>
            </div>
            <p className="hand-instructions-modal__gesture-sub">
              Keep all fingers up then quickly clench all fingers down to a fist, then quickly
              unclench fist to an open hand to click Back once.
            </p>
          </div>
        </div>

        <p className="hand-instructions-modal__body">
          There are 9 clickable items in the garage. Each item shows a part of me, a part of my
          resume, or an experience. Happy hunting!
        </p>

        <div className="hand-instructions-modal__footer">
          <button type="button" className="welcome-gate__btn clickable-hover" onClick={onBegin}>
            Begin!
          </button>
        </div>
      </div>
    </div>
  );
}
