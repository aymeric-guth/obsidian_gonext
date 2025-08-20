build() {
	npm run build
	v versions.json
	v manifest.json
	git add . && git commit -m "Update version"
	git tag -a 1.0.13 -m "1.0.13" && git push origin master && git push origin 1.0.13
}
