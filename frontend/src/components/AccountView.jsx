import React, { useMemo, useState } from "react";

const formatDate = (value) => {
  if (!value) return "Just joined";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just joined";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getInitials = (email = "") =>
  email
    .split("@")[0]
    .split(/[\W_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

const AccountView = ({
  user,
  likedCount,
  passedCount,
  likedSongs,
  passedSongs,
  isLoading,
  onBackToDiscover,
  onSignOut,
}) => {
  const [activeList, setActiveList] = useState("liked");

  const joinedDate = useMemo(
    () => formatDate(user?.metadata?.creationTime),
    [user?.metadata?.creationTime]
  );

  const items = activeList === "liked" ? likedSongs : passedSongs;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 md:px-6 md:py-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1DB954] text-xl font-bold text-black">
                {getInitials(user?.email)}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Account
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-white">
                  {user?.email || "Your profile"}
                </h1>
                <p className="mt-1 text-sm text-white/60">
                  Member since {joinedDate}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onBackToDiscover}
                className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
              >
                Discover
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Log out
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard label="Liked songs" value={likedCount} tone="green" />
            <StatCard label="Passed songs" value={passedCount} tone="red" />
            <StatCard
              label="Total decisions"
              value={likedCount + passedCount}
              tone="neutral"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5 md:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">
            Listening shape
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Your session snapshot
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Keep swiping to teach the app what you like. Your account now tracks
            the songs you saved, the tracks you skipped, and how active you have
            been in the app.
          </p>

          <div className="mt-6 space-y-4">
            <ProgressRow
              label="Like rate"
              value={likedCount}
              total={likedCount + passedCount}
              colorClass="bg-[#1DB954]"
            />
            <ProgressRow
              label="Pass rate"
              value={passedCount}
              total={likedCount + passedCount}
              colorClass="bg-rose-400"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="text-sm font-medium text-white">User ID</p>
            <p className="mt-2 break-all text-xs leading-5 text-white/55">
              {user?.uid}
            </p>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">
              Activity
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Your music history
            </h2>
          </div>

          <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1">
            <ToggleButton
              active={activeList === "liked"}
              onClick={() => setActiveList("liked")}
            >
              Liked
            </ToggleButton>
            <ToggleButton
              active={activeList === "passed"}
              onClick={() => setActiveList("passed")}
            >
              Passed
            </ToggleButton>
          </div>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-10 text-center text-sm text-white/60">
              Loading your account activity...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 px-4 py-10 text-center">
              <p className="text-lg font-medium text-white">
                No songs here yet
              </p>
              <p className="mt-2 text-sm text-white/60">
                Swipe in Discover to start building your account history.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((song) => (
                <SongRow key={song.id || song.spotifyId} song={song} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ label, value, tone }) => {
  const accentClass =
    tone === "green"
      ? "text-[#1DB954]"
      : tone === "red"
        ? "text-rose-400"
        : "text-white";

  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <p className="text-sm text-white/55">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
};

const ProgressRow = ({ label, value, total, colorClass }) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-white/70">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

const ToggleButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-4 py-2 text-sm transition ${
      active
        ? "bg-white text-black"
        : "text-white/70 hover:text-white"
    }`}
  >
    {children}
  </button>
);

const SongRow = ({ song }) => (
  <article className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-3">
    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/8">
      {song.imageUrl ? (
        <img
          src={song.imageUrl}
          alt={song.title || "Album art"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/45">
          ♪
        </div>
      )}
    </div>

    <div className="min-w-0">
      <p className="truncate text-base font-medium text-white">
        {song.title || "Untitled track"}
      </p>
      <p className="mt-1 truncate text-sm text-white/65">
        {song.artist || "Unknown artist"}
      </p>
      <p className="mt-1 truncate text-xs text-white/45">
        {song.album || "Unknown album"}
      </p>
    </div>
  </article>
);

export default AccountView;
