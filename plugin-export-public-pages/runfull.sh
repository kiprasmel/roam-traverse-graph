#!/usr/bin/env bash
 
set -e

PRIVATE_NOTES_DIR="${1:-$HOME/projects/notes-private}"
PRIVATE_NOTES_USERNAME="${2:-sarpik}"
PRIVATE_NOTES_REPO_NAME="${3:-notes}" # TODO notes-private by default
PUBLIC_NOTES_ROOT_URL="${4:-http://kiprasmel.github.io/notes}"
PUBLIC_NOTES_DIR="${5:-notes}"

###

pushd "$PUBLIC_NOTES_DIR"

# https://stackoverflow.com/a/9393642/9285308
[ -z "$(git status -s)" ] || {
	printf "\nuncommitted changes in PUBLIC_NOTES_DIR ($PUBLIC_NOTES_DIR) ($(pwd))\n\n"
	exit 1
}

git pull

popd

###

diffy() {
	git diff --staged --stat --color=always | less
}

commit_push() {
	MSG="${1:-Automated snapshot (manual)}"
	git commit --no-gpg-sign -m "$MSG"
	git push
}

###
 
pushd "$PRIVATE_NOTES_DIR"

# create one yourself, until maybe we do a generalised one, hehe.
bash ./run.sh

git add .
diffy

commit_push

COMMIT_SHA="$(git show --pretty=format:'%H' | head -n 1)"
 
popd

###
 
./generate-static-html-pages.ts

pushd "$PUBLIC_NOTES_DIR"

git add .
diffy

commit_push "deploy (manual): http://github.com/$PRIVATE_NOTES_USERNAME/$PRIVATE_NOTES_REPO_NAME/commit/$COMMIT_SHA"

popd
 
###

printf "\n$PUBLIC_NOTES_ROOT_URL\n\n"
