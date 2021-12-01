#!/usr/bin/env bash
 
set -e

PRIVATE_NOTES_DIR="${1:-$HOME/projects/notes-private}"
PRIVATE_NOTES_USERNAME="${2:-sarpik}"
PRIVATE_NOTES_REPO_NAME="${3:-notes}" # TODO notes-private by default
PUBLIC_NOTES_ROOT_URL="${4:-http://kiprasmel.github.io/notes}"
PUBLIC_NOTES_DIR="${5:-notes}"
DO_NOT_REGENERATE_IF_NO_NEW_CHANGES_IN_PRIVATE_NOTES_REPO="${6:-0}"

###

repo_has_untracked_changes() {
	[ -z "$(git status -s)" ] && return 1 || return 0
}

pushd "$PUBLIC_NOTES_DIR"

# https://stackoverflow.com/a/9393642/9285308
repo_has_untracked_changes && {
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

	do_it() {
		git commit --no-gpg-sign -m "$MSG"
		git push
	}

	if [ "$DO_NOT_REGENERATE_IF_NO_NEW_CHANGES_IN_PRIVATE_NOTES_REPO" == 0 ]; then
		# if no new changes - do not fail & still proceed further
		if ! repo_has_untracked_changes; then
			printf "\nno new changes. still proceeding, because DO_NOT_REGENERATE_IF_NO_NEW_CHANGES_IN_PRIVATE_NOTES_REPO was not set.\n\n"
		else
			do_it
		fi
	else
		# if  no new changes - will exit;
		# if are new changes - will continue.
		do_it
	fi
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
