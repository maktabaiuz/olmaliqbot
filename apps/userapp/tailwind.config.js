/** Stitch eksportidagi 39 ekranning Tailwind sozlamalari birlashtirilgan (design/user-app). Dizayn tokenlari shu yerda — qo'lda o'zgartirilmaydi. */
export default {
  "content": [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  "darkMode": "class",
  "theme": {
    "extend": {
      "colors": {
        "on-primary-container": "#faf6ff",
        "tertiary-fixed-dim": "#38debb",
        "on-primary": "#ffffff",
        "on-surface": "#161d1f",
        "on-tertiary-container": "#e0fff3",
        "on-background": "#161d1f",
        "on-error": "#ffffff",
        "secondary-container": "#fdc73a",
        "on-error-container": "#93000a",
        "surface-bright": "#f4fafd",
        "on-secondary-container": "#6f5400",
        "surface-dim": "#d4dbdd",
        "primary": "#5341cd",
        "primary-fixed-dim": "#c6bfff",
        "tertiary-fixed": "#5ffbd6",
        "on-surface-variant": "#474554",
        "secondary-fixed": "#ffdf9a",
        "inverse-on-surface": "#ebf2f4",
        "background": "#f4fafd",
        "secondary-fixed-dim": "#f4bf32",
        "surface-variant": "#dde4e6",
        "on-tertiary-fixed-variant": "#005142",
        "outline": "#787586",
        "surface-container-lowest": "#ffffff",
        "primary-container": "#6c5ce7",
        "surface-container": "#e8eff1",
        "on-primary-fixed": "#160066",
        "inverse-primary": "#c6bfff",
        "on-tertiary-fixed": "#002019",
        "surface-tint": "#5847d2",
        "error-container": "#ffdad6",
        "on-tertiary": "#ffffff",
        "secondary": "#775a00",
        "surface-container-highest": "#dde4e6",
        "on-secondary-fixed": "#251a00",
        "on-secondary": "#ffffff",
        "surface": "#f4fafd",
        "on-primary-fixed-variant": "#4029ba",
        "tertiary-container": "#00816a",
        "primary-fixed": "#e4dfff",
        "inverse-surface": "#2b3234",
        "surface-container-low": "#eef5f7",
        "on-secondary-fixed-variant": "#5a4300",
        "surface-container-high": "#e2e9ec",
        "outline-variant": "#c8c4d7",
        "tertiary": "#006653",
        "error": "#ba1a1a",
        "brand": {
          "violet": "#6C5CE7",
          "violet-light": "#8E82EC",
          "violet-dark": "#5542D0",
          "yellow": "#FFC93C",
          "yellow-light": "#FFDF73",
          "mint": "#00C9A7",
          "mint-light": "#38E3C5",
          "coral": "#FF6B6B",
          "coral-light": "#FF8E8E",
          "sky": "#4DA3FF",
          "sky-light": "#77BAFF"
        }
      },
      "borderRadius": {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px",
        "card": "24px",
        "chip": "16px"
      },
      "spacing": {
        "space-sm": "0.5rem",
        "space-xs": "0.25rem",
        "space-lg": "1rem",
        "space-md": "0.75rem",
        "margin": "1rem",
        "gutter": "0.75rem",
        "space-xl": "1.5rem"
      },
      "fontFamily": {
        "label-sm": [
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "body-lg": [
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "headline-sm": [
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "label-md": [
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "body-sm": [
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "body-md": [
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "headline-xl": [
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "headline-lg": [
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "headline-md": [
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "label-lg": [
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "nunito": [
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "display": [
          "Plus Jakarta Sans",
          "sans-serif"
        ]
      },
      "fontSize": {
        "label-sm": [
          "10px",
          {
            "lineHeight": "14px",
            "letterSpacing": "0.04em",
            "fontWeight": "800"
          }
        ],
        "body-lg": [
          "16px",
          {
            "lineHeight": "24px",
            "fontWeight": "500"
          }
        ],
        "headline-sm": [
          "17px",
          {
            "lineHeight": "24px",
            "fontWeight": "700"
          }
        ],
        "label-md": [
          "12px",
          {
            "lineHeight": "16px",
            "letterSpacing": "0.02em",
            "fontWeight": "700"
          }
        ],
        "body-sm": [
          "12px",
          {
            "lineHeight": "16px",
            "fontWeight": "400"
          }
        ],
        "body-md": [
          "14px",
          {
            "lineHeight": "20px",
            "fontWeight": "500"
          }
        ],
        "headline-xl": [
          "32px",
          {
            "lineHeight": "40px",
            "letterSpacing": "-0.02em",
            "fontWeight": "800"
          }
        ],
        "headline-lg": [
          "26px",
          {
            "lineHeight": "34px",
            "letterSpacing": "-0.015em",
            "fontWeight": "800"
          }
        ],
        "headline-md": [
          "20px",
          {
            "lineHeight": "28px",
            "letterSpacing": "-0.01em",
            "fontWeight": "700"
          }
        ],
        "label-lg": [
          "14px",
          {
            "lineHeight": "18px",
            "fontWeight": "700"
          }
        ]
      },
      "boxShadow": {
        "clay-sm": "0 4px 12px -2px rgba(108, 92, 231, 0.12), inset 0 2px 2px rgba(255, 255, 255, 0.8)",
        "clay-md": "0 8px 24px -4px rgba(108, 92, 231, 0.16), 0 2px 6px rgba(0,0,0,0.04), inset 0 2px 3px rgba(255, 255, 255, 0.9)",
        "clay-lg": "0 16px 36px -6px rgba(108, 92, 231, 0.22), 0 4px 12px rgba(0,0,0,0.06), inset 0 3px 4px rgba(255, 255, 255, 0.9)",
        "clay-card": "0 12px 30px -8px rgba(15, 23, 42, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.9)",
        "clay-card-dark": "0 12px 30px -8px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
        "inner-press": "inset 0 4px 8px rgba(0, 0, 0, 0.22)"
      }
    }
  }
};
