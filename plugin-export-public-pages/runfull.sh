#!/usr/bin/env bash
 
set -e

# https://stackoverflow.com/a/24112741/9285308
DIRNAME="$(cd "$(dirname "${BASH_SOURCE[0]}")"; pwd -P)"
printf "DIRNAME $DIRNAME\n"

PRIVATE_NOTES_REPO_NAME="${PRIVATE_NOTES_REPO_NAME:-notes-private}"
PRIVATE_NOTES_DIR="${PRIVATE_NOTES_DIR:-$HOME/projects/${PRIVATE_NOTES_REPO_NAME}}"
PRIVATE_GRAPH_NAME="${PRIVATE_GRAPH_NAME:-kipras-g1.json}"
export PATH_TO_ROAM_GRAPH="${PATH_TO_ROAM_GRAPH:-${PRIVATE_NOTES_DIR}/json/${PRIVATE_GRAPH_NAME}}" # for generate-static-html-pages.ts
PRIVATE_NOTES_USERNAME="${PRIVATE_NOTES_USERNAME:-sarpik}"
PUBLIC_NOTES_ROOT_URL="${PUBLIC_NOTES_ROOT_URL:-http://kiprasmel.github.io/notes}"
PUBLIC_NOTES_DIR="${PUBLIC_NOTES_DIR:-notes}"
PUBLIC_NOTES_GITHUB_URL=${PUBLIC_NOTES_GITHUB_URL:-"http://github.com/kiprasmel/notes"}
DO_NOT_REGENERATE_IF_NO_NEW_CHANGES_IN_PRIVATE_NOTES_REPO="${DO_NOT_REGENERATE_IF_NO_NEW_CHANGES_IN_PRIVATE_NOTES_REPO:-0}"

# set this to true if you don't have access to the private notes repo,
# but you can open roam & export-all as json
# & place that json in the private notes repo.
DO_NOT_RUN_PRIVATE_NOTES="${DO_NOT_RUN_PRIVATE_NOTES:-0}"

# set this if e.g. you're experimenting w/ a new version
# of the parser, and want to run thru the whole process,
# but without actually pushing nor publishing the changes
# in the public notes repo.
# almost like DRY_RUN
#
# also useful if you have a custom way to commit & publish changes,
# e.g. inside a CI environment
# (e.g. a github action to publish to github pages)
#
DO_NOT_PUSH_PUBLIC_NOTES="${DO_NOT_PUSH_PUBLIC_NOTES:-0}"

# should auto-accept prompts that default to yes
# possibly in the future - those who are neutral as well
YES="${YES:-0}"

# fix up (amend) the latest commit in the private & public notes' repos.
#
# useful in case you recently ran the script,
# but then did a few small changes & want to include them
# w/o waiting, but also w/o polluting the commit history.
#
# or, if e.g. commit included some information you don't want public.
# though, it's not as easy to get rid of completely,
# see e.g. https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
#
FIXUP_LAST="${FIXUP_LAST:-0}"

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
	printf "\ndiscard with 'git reset --hard HEAD'? [Y/n] "

	if [ "$YES" -eq 0 ]; then
		read -r answer
	else 
		answer="y"
	fi

	if [ "$answer" = "y" ] || [ "$answer" = "Y" ] || [ "$answer" = "" ]; then
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
	if [ "$YES" -eq 0 ]; then
		git            diff --staged --stat --color=always | less
	else
		git --no-pager diff --staged --stat --color=always
	fi
}

commit_push() {
	MSG="${1:-Automated snapshot (manual)}"

	do_it() {
		COMMIT_AMEND_ARG=""
		PUSH_FORCE_FLAG=""
		[ "$FIXUP_LAST" != 0 ] && {
			AMEND_ARG="--amend"

			# as safe as possible.
			#
			# for max safety, it is expected that a "git pull" is performed
			# before doing the force push.
			# we do the pull here (as in - the public notes repo),
			# and also in our "run.sh" script in the private notes repo.
			#
			PUSH_FORCE_FLAG="--force --force-with-lease --force-if-includes"
		}

		git commit $AMEND_ARG --no-gpg-sign -m "$MSG"

		git push $PUSH_FORCE_FLAG
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

	repo_has_untracked_changes && {
		printf "\nuncommitted changes in PRIVATE_NOTES_DIR ($PRIVATE_NOTES_DIR) ($(pwd))\n"
	
		printf "\nthe changes are most likely auto-generated."
		printf "\ndiscard with 'git reset --hard HEAD'? [Y/n] "

		if [ "$YES" -eq 0 ]; then
			read -r answer
		else 
			answer="y"
		fi
	
		if [ "$answer" = "y" ] || [ "$answer" = "Y" ] || [ "$answer" = "" ]; then
			printf "\n"
			git reset --hard HEAD
		else
			exit 0
		fi
	}

	# create one yourself, until maybe we do a generalised one, hehe.
	bash ./run.sh
	
	git add .
	diffy
	
	commit_push
else
	printf "\nNOT running run.sh in private notes dir (skipped because DO_NOT_RUN_PRIVATE_NOTES set).\n\n"
fi

get_git_sha() {
	git show --pretty=format:'%H' | head -n 1
}

NOTES_COMMIT_SHA="$(get_git_sha)"

popd

ROAM_TRAVERSE_GRAPH_COMMIT_SHA="$(get_git_sha)"

###

# yarn ts-node-dev "$DIRNAME"/generate-static-html-pages.ts
# for debugging/profiling:
EXE="$(realpath $DIRNAME/../dist/plugin-export-public-pages/generate-static-html-pages.js)"
# node "$EXE"
# node --prof "$EXE"
0x "$EXE"
# 0x --visualize-cpu-profile -- node --cpu-prof "$EXE"
# 0x -- node --cpu-prof "$EXE"
# node --inspect-brk "$EXE"

pushd "$PUBLIC_NOTES_DIR"

# disabled because would not take into account untracked changes,
# and since we significantly improved the speed of "add_meaningful_files",
# we do the proper checking there.
#
## returns 0 (success) if any meaningful changes exist
## after cleaning up the meaningless ones.
## otherwise, returns 1
#meaningless_change_cleanup() {
#	NEEDLE="GIT_MEANINGLESS_CHANGE"
#
#	COUNT="$(git diff -I "$NEEDLE" | wc -l)"
#	[ $COUNT -eq 0 ] && {
#		printf "\n0 meaningful changes.\n\n"
#		return 1
#	}
#
#	return 0
#}
add_meaningful_files() {
	# GNU sed required for next cmd, so verify it is correct
	sed --version | grep "GNU sed" &>/dev/null || {
		>&2 printf "GNU sed required, but was not detected.\n"
		exit 1
	}

	# modified, if modifications include changes
	# outside of lines tagged with the "GIT_MEANINGLESS_CHANGE" string
	git status --porcelain=1 | grep "^ M" | sed 's/^ M //g;' | git --no-pager diff -I "GIT_MEANINGLESS_CHANGE" --stat=1000 | head -n -1 | cut -d"|" -f1 | sed 's/^\s*//g; s/\s*$//g; s/^"//g; s/"$//g; s/\\"/"/g;' > /tmp/gsr-new && git add --pathspec-from-file=/tmp/gsr-new

	# untracked files
	untracked_path="/tmp/git-meaningful-files--untracked"
	git status --porcelain=1 | grep "^??" | sed "s/^?? //g;" > "$untracked_path" && git add --pathspec-from-file="$untracked_path"
}
# must be done __after__ comitting
remove_meaningless_files() {
	git add .
	git reset --hard HEAD
}

add_meaningful_files
diffy

HAS_TEMP_COMMIT=0

COUNT="$(git diff --staged | wc -l)"
if [ $COUNT -eq 0 ]; then
	printf "\n0 meaningful changes after individual file examination.\n\n"
else
	MSG="\
deploy (manual): http://github.com/$PRIVATE_NOTES_USERNAME/$PRIVATE_NOTES_REPO_NAME/commit/$NOTES_COMMIT_SHA

http://github.com/kiprasmel/roam-traverse-graph/commit/$ROAM_TRAVERSE_GRAPH_COMMIT_SHA
"

	if [ "$DO_NOT_PUSH_PUBLIC_NOTES" = "0" ]; then
		commit_push "$MSG"
	else 
		printf "\nNOT pushing nor publishing public notes (skipped because DO_NOT_PUSH_PUBLIC_NOTES set).\n\n"

		git commit --no-gpg-sign -m "TEMP commit to avoid removing all changes. needs cleanup after remove_meaningless_files"
		HAS_TEMP_COMMIT=1
	fi
fi

remove_meaningless_files

if [ "$HAS_TEMP_COMMIT" -eq 1 ]; then
	git reset "HEAD~"
fi

popd
 
###

printf "\n\n$PUBLIC_NOTES_GITHUB_URL\n$PUBLIC_NOTES_ROOT_URL\n\n"
