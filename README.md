# Load Bearing

System design, one animated step at a time: 40 short lessons across nine modules (Foundations, Scaling, Data, Messaging, Reliability, Architecture, Security, Delivery and Case Studies). Each lesson steps through an animated diagram of requests moving through a system.

**Live site:** https://supal.github.io/load-bearing/

## Run locally

The site is plain HTML, CSS and JavaScript with no build step. Serve the folder with any static file server:

```sh
python -m http.server 8080
# then open http://127.0.0.1:8080/
```

## Project layout

| Path | What it holds |
|---|---|
| `index.html` | Page shell and script order |
| `css/styles.css` | All styles, including light and dark themes |
| `js/engine.js` | SVG diagram engine that animates packets along edges |
| `js/app.js` | Router, home page, lesson player, search and progress |
| `js/curriculum.js` | Module and lesson outline |
| `js/lessons/*.js` | Lesson content: diagram layout and steps, one file per module |

## Adding or editing a lesson

Each lesson registers itself in `window.LESSONS` under the slug used in `curriculum.js`:

```js
LESSONS['my-lesson'] = {
  minutes: 6,
  diagram: {
    nodes: [{ id: 'app', kind: 'server', label: 'App', x: 200, y: 230 }, /* … */],
    edges: [['app', 'db']]
  },
  steps: [{
    title: 'Step title',
    flows: [{ from: 'app', to: 'db', label: 'SELECT', seq: 0 }],
    body: '<p>Explanation…</p>'
  }]
};
```

Step options include `flows`, `focus`, `hide`, `states`, `badges`, `scale` and `slot`, plus extras rendered under the text: `metrics`, `bars`, `math`, `table`, `code` and `tip`. See the comment at the top of `js/engine.js`.

Progress and theme are stored only in the browser's local storage.
