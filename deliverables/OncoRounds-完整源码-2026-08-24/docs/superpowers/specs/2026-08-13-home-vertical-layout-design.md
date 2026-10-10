# OncoRounds Home Vertical Layout Design

## Scope

Only adjust the home screen's vertical layout. Keep all home content, visual styling, typography, colors, imagery, navigation behavior, and every inner screen unchanged.

## Approved direction

- Treat the brand lockup, featured case card, and action/disclaimer group as one vertically balanced content stack.
- Center the stack within the viewport with its visual center slightly above the mathematical center.
- Use responsive vertical gaps so tall phones gain breathing room without creating a detached CTA.
- On short phones, keep compact spacing and allow vertical scrolling rather than clipping content.
- Preserve safe-area insets.

## Acceptance criteria

- At 390×844, the action group ends substantially lower than the current 617px baseline while remaining fully visible.
- At 360×740, the button and both disclaimer lines remain visible without overlap or clipping.
- The top and bottom whitespace feel balanced, with the stack slightly biased upward.
- No component markup, content, colors, or inner-page styles change.

## Validation

- Use live browser measurements at 390×844 and 360×740.
- Confirm the home CTA still opens the case overview.
- Run the full Vitest suite and production build.

