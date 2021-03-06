# plugin-export-public-pages

you've heard about "_build_ in public". it's time for "_think_ in public".

of course, not everything should be shared. with this plugin, you can define simple rules to _mark_ a page or a block as public (most oftenly - simply by adding the `#public` tag, which is also configurable), use the plugin on your exported graph, and generate either a new graph you can import into roam, or generate a website you can host anywhere.

everything is made to be configurable. if that's not enough, you can modify the code yourself. we'll even have a way to easily create a custom html / whatever more advanced website generator, so you can customize the looks, without having to modify the plugin itself too much if at all.

documentation on how to set this whole thing up is underway. myself i have a private repository to run a github action that runs this plugin on an hourly schedule - the plugin exports my roam graph and saves it in a different repository, parses the graph, extracts metadata (e.g. linked references & what you can infer from them, using the config), generates the html pages, pushes the html pages into another, now public, repository, and from there the static html gets automatically deployed on github pages.

for more up-to-date info, especially before these docs are properly done, see my notes, whom are of course generated by this plugin:

https://kiprasmel.github.io/notes/roam-traverse-graph.html
