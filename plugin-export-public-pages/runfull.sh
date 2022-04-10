#!/usr/bin/env bash
 
set -e

PRIVATE_NOTES_DIR="${1:-$HOME/projects/notes-private}"
PRIVATE_NOTES_USERNAME="${2:-sarpik}"
PRIVATE_NOTES_REPO_NAME="${3:-notes}" # TODO notes-private by default
PUBLIC_NOTES_ROOT_URL="${4:-http://kiprasmel.github.io/notes}"
PUBLIC_NOTES_DIR="${5:-notes}"
PUBLIC_NOTES_GITHUB_URL=${6:-"http://github.com/kiprasmel/notes"}
DO_NOT_REGENERATE_IF_NO_NEW_CHANGES_IN_PRIVATE_NOTES_REPO="${7:-0}"

# set this to true if you don't have access to the private notes repo,
# but you can open roam & export-all as json
# & place that json in the private notes repo.
DO_NOT_RUN_PRIVATE_NOTES="${DO_NOT_RUN_PRIVATE_NOTES:-0}"

[ -z "$NOTES_OF_NAME" ] && {
	cache_file="cache--NOTES_OF_NAME"
	if [ -f "$cache_file" ]; then
		export NOTES_OF_NAME="$(cat "$cache_file")"
	else
		printf "NOTES_OF_NAME? "
		read NOTES_OF_NAME
		export NOTES_OF_NAME="$NOTES_OF_NAME"
		printf "$NOTES_OF_NAME" > "$cache_file"
	fi
}

###

repo_has_untracked_changes() {
	[ -z "$(git status -s)" ] && return 1 || return 0
}

! [ -d "$PUBLIC_NOTES_DIR" ] && {
	printf "\nPUBLIC_NOTES_DIR ($PUBLIC_NOTES_DIR) not found. cloning.\n\n"
	git clone --depth=1 "$PUBLIC_NOTES_GITHUB_URL"
}
pushd "$PUBLIC_NOTES_DIR"

ls -a | grep ".git" &>/dev/null || {
	printf "\nerror - PUBLIC_NOTES_DIR ($PUBLIC_NOTES_DIR) _not_ a git repository."
	printf "\nyou probably forgot to clone the repo & only ran the script to generate html. exiting. \n"
	printf "\n"
	exit 1
}

# https://stackoverflow.com/a/9393642/9285308
repo_has_untracked_changes && {
	printf "\nuncommitted changes in PUBLIC_NOTES_DIR ($PUBLIC_NOTES_DIR) ($(pwd))\n"

	printf "\nthe html is most likely generated."
	printf "\ndiscard with 'git reset --hard HEAD'? [y/N] "
	read -r answer

	if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
		printf "\n"
		git reset --hard HEAD
	else
		exit 0
	fi
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

if [ "$DO_NOT_RUN_PRIVATE_NOTES" = 0 ]; then
	printf "\nrunning run.sh in private notes dir\n\n"
	
	! [ -f "./run.sh" ] && {
		printf "\nerror - run.sh file missing in PRIVATE_NOTES_DIR ($PRIVATE_NOTES_DIR)"
		printf "\na) create the run.sh script, or"
		printf "\nb) set DO_NOT_RUN_PRIVATE_NOTES to any value and run again."
		printf "\n\nthe B scenario is useful if e.g. you don't have access to the private notes repo,"
		printf "\nbut you are logged in in roam, and can yourself click export-all"
		printf "\n& place the json in the same location as the private notes repo"
		printf "\n($PRIVATE_NOTES_DIR), most likely inside /json/"
		printf "\n\n"
		exit 1
	}

	# create one yourself, until maybe we do a generalised one, hehe.
	bash ./run.sh
	
	git add .
	diffy
	
	commit_push
else
	printf "\nNOT running run.sh in private notes dir (skipped because DO_NOT_RUN_PRIVATE_NOTES set).\n\n"
fi

COMMIT_SHA="$(git show --pretty=format:'%H' | head -n 1)"

popd

###
 
./generate-static-html-pages.ts

pushd "$PUBLIC_NOTES_DIR"

# returns 0 (success) if any meaningful changes exist
# after cleaning up the meaningless ones.
# otherwise, returns 1
meaningless_change_cleanup() {
	NEEDLE="GIT_MEANINGLESS_CHANGE"

	COUNT="$(git diff -I "$NEEDLE" | wc -l)"
	[ $COUNT -eq 0 ] && {
		printf "\n0 meaningful changes.\n\n"
		return 1
	}

	return 0
}
add_meaningful_files() {
	# modified, if modifications include changes
	# outside of lines tagged with the "GIT_MEANINGLESS_CHANGE" string
	git status --porcelain=1 | grep "^ M" | cut -d"M" -f2 | git --no-pager diff -I "GIT_MEANINGLESS_CHANGE" --stat=1000 | head -n -1 | cut -d"|" -f1 | while read line; do line="$(sed 's/^"//g; s/"$//g;' <<< $line)"; git add "$line"; done

	# untracked files
	git status --porcelain=1 | grep "^??" | sed "s/^?? //g;" | xargs git add
}
# must be done __after__ comitting
remove_meaningless_files() {
	git add .
	git reset --hard HEAD
}

meaningless_change_cleanup && {
	add_meaningful_files
	diffy

	COUNT="$(git diff --staged | wc -l)"
	if [ $COUNT -eq 0 ]; then
		printf "\n0 meaningful changes after individual file examination.\n\n"
	else
		commit_push "deploy (manual): http://github.com/$PRIVATE_NOTES_USERNAME/$PRIVATE_NOTES_REPO_NAME/commit/$COMMIT_SHA"
	fi

	remove_meaningless_files
}

popd
 
###

printf "\n\n$PUBLIC_NOTES_GITHUB_URL\n$PUBLIC_NOTES_ROOT_URL\n\n"
