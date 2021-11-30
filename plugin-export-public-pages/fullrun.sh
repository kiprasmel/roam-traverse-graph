#!/usr/bin/env bash
 
set -e

PRIVATE_NOTES_DIR="${1:-$HOME/projects/notes-private}"
PRIVATE_NOTES_USERNAME="${2:-sarpik}"
PRIVATE_NOTES_REPO_NAME="${3:-notes}" # TODO notes-private by default
PUBLIC_NOTES_ROOT_URL="${4:-http://kiprasmel.github.io/notes}"
 
pushd "$PRIVATE_NOTES_DIR"

# create one yourself, until maybe we do a generalised one, hehe.
bash ./run.sh

diffy() {
	git diff --staged --stat --color=always | less
}

commit_push() {
	MSG="${1:-Automated snapshot (manual)}"
	git commit --no-gpg-sign -m "$MSG"
	git push
}
 
git add .
diffy

commit_push

COMMIT_SHA="$(git show --pretty=format:'%H' | head -n 1)"
 
popd



./generate-static-html-pages.ts
 


pushd ./notes

git add .
diffy

commit_push "deploy (manual): http://github.com/$PRIVATE_NOTES_USERNAME/$PRIVATE_NOTES_REPO_NAME/commit/$COMMIT_SHA"

popd
 


printf "\n$PUBLIC_NOTES_ROOT_URL\n\n"
