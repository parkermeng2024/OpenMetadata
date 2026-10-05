#!/usr/bin/env sh
# Spotless entry point for the pre-commit `google-style-java` hook.
#
# Locates a JDK matching the project's target Java version (the <source> value in
# pom.xml) instead of relying on the caller's shell having JAVA_HOME exported, so
# `git commit` works from any terminal - a shell left on the previous JDK fails
# the Maven build before spotless ever runs.
set -e

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
REQUIRED_JAVA=$(sed -n 's/.*<source>\([0-9][0-9]*\)<\/source>.*/\1/p' "$ROOT_DIR/pom.xml" | head -1)

if [ -z "$REQUIRED_JAVA" ]; then
  echo "format-code: cannot read the Java version from $ROOT_DIR/pom.xml" >&2
  exit 1
fi

# Prints the major version of the JDK rooted at $1 (empty when there is none).
java_major() {
  if [ ! -x "$1/bin/java" ]; then
    return 0
  fi
  "$1/bin/java" -version 2>&1 | sed -n '1s/.*version "\([0-9]*\)\.\([0-9]*\).*/\1 \2/p' |
    awk '{ print ($1 == 1 ? $2 : $1) }'
}

jdk_candidates() {
  printf '%s\n' "$JAVA_HOME"
  if [ -n "$HOMEBREW_PREFIX" ]; then
    printf '%s\n' "$HOMEBREW_PREFIX/opt/openjdk@$REQUIRED_JAVA/libexec/openjdk.jdk/Contents/Home"
  fi
  if [ -x /usr/libexec/java_home ]; then
    /usr/libexec/java_home -v "$REQUIRED_JAVA" 2>/dev/null || true
  fi
  printf '%s\n' \
    "/opt/homebrew/opt/openjdk@$REQUIRED_JAVA/libexec/openjdk.jdk/Contents/Home" \
    "/usr/local/opt/openjdk@$REQUIRED_JAVA/libexec/openjdk.jdk/Contents/Home"
  ls -d /usr/lib/jvm/*"$REQUIRED_JAVA"* 2>/dev/null || true
}

java_ok() {
  major=$(java_major "$1")
  if [ -n "$major" ] && [ "$major" -ge "$REQUIRED_JAVA" ]; then
    return 0
  fi
  return 1
}

ON_PATH=$(command -v java 2>/dev/null || true)
if [ -n "$ON_PATH" ] && java_ok "${ON_PATH%/bin/java}"; then
  cd "$ROOT_DIR"
  exec mvn spotless:apply
fi

FOUND_JDK=""
for candidate in $(jdk_candidates | sort -u); do
  if java_ok "$candidate"; then
    FOUND_JDK=$candidate
    break
  fi
done

if [ -z "$FOUND_JDK" ]; then
  echo "format-code: this project needs JDK $REQUIRED_JAVA, but the default java is $(java_major "${ON_PATH%/bin/java}" | sed 's/^$/not found/')." >&2
  echo "  Install it (macOS: brew install openjdk@$REQUIRED_JAVA), or run 'make dev_setup'," >&2
  echo "  then point JAVA_HOME at it if it is not in a standard location." >&2
  exit 1
fi

JAVA_HOME=$FOUND_JDK
PATH="$JAVA_HOME/bin:$PATH"
export JAVA_HOME PATH

cd "$ROOT_DIR"
exec mvn spotless:apply