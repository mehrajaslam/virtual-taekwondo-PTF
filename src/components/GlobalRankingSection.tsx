import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowDownUp,
  Award,
  CheckCircle2,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Trophy,
  UserCheck,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { AthleteProgress } from '../types/taekwondo';

export type RankingSortField = 'totalMinutesTrained' | 'totalRepsLogged';
export type BeltDivision = 'White / Yellow' | 'Green / Blue' | 'Red / Black';

export interface AthleteRankingEntry {
  uid: string;
  displayName: string;
  clubCity: string;
  beltLevel: BeltDivision;
  totalMinutesTrained: number;
  totalRepsLogged: number;
  completedDrillsCount: number;
  practicedTechniquesCount: number;
  isPublic: boolean;
  updatedAt?: Timestamp | null;
}

interface GlobalRankingSectionProps {
  localProgress: AthleteProgress;
  onMergeCloudStats?: (minutes: number, reps: number) => void;
}

const DEFAULT_CITIES = [
  'Islamabad',
  'Lahore',
  'Karachi',
  'Peshawar',
  'Quetta',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
];

function sanitizeString(val: string, fallback: string, maxLen = 40): string {
  const trimmed = val.trim().slice(0, maxLen);
  return trimmed.length >= 2 ? trimmed : fallback;
}

function clampInt(n: number, max: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), max);
}

export const GlobalRankingSection: React.FC<GlobalRankingSectionProps> = ({
  localProgress,
  onMergeCloudStats,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [entries, setEntries] = useState<AthleteRankingEntry[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter & Sort Controls
  const [sortBy, setSortBy] = useState<RankingSortField>('totalMinutesTrained');
  const [beltFilter, setBeltFilter] = useState<'ALL' | BeltDivision>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Editable Athlete Profile Card (non-PII public fields)
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('PTF Athlete');
  const [clubCityInput, setClubCityInput] = useState('Islamabad');
  const [beltLevelInput, setBeltLevelInput] = useState<BeltDivision>('White / Yellow');

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser?.displayName) {
        setDisplayNameInput(sanitizeString(currentUser.displayName, 'PTF Athlete', 40));
      }
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listener (active only when auth is ready and user is signed in)
  useEffect(() => {
    if (!authReady || !user) {
      setEntries([]);
      setLoadingList(false);
      return;
    }

    setLoadingList(true);
    setErrorMessage(null);

    const path = 'athlete_rankings';
    const q = query(
      collection(db, path),
      where('isPublic', '==', true),
      limit(100),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: AthleteRankingEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as AthleteRankingEntry;
          list.push({
            uid: data.uid,
            displayName: data.displayName,
            clubCity: data.clubCity,
            beltLevel: data.beltLevel,
            totalMinutesTrained: data.totalMinutesTrained ?? 0,
            totalRepsLogged: data.totalRepsLogged ?? 0,
            completedDrillsCount: data.completedDrillsCount ?? 0,
            practicedTechniquesCount: data.practicedTechniquesCount ?? 0,
            isPublic: Boolean(data.isPublic),
            updatedAt: data.updatedAt ?? null,
          });
        });
        setEntries(list);
        setLoadingList(false);

        const mine = list.find((e) => e.uid === user.uid);
        if (mine) {
          setDisplayNameInput(mine.displayName);
          setClubCityInput(mine.clubCity);
          setBeltLevelInput(mine.beltLevel);
          if (onMergeCloudStats) {
            onMergeCloudStats(mine.totalMinutesTrained, mine.totalRepsLogged);
          }
        }
      },
      (err) => {
        setLoadingList(false);
        try {
          handleFirestoreError(err, OperationType.LIST, path);
        } catch (wrapped) {
          setErrorMessage(
            wrapped instanceof Error
              ? 'Unable to load Global Ranking right now. Please try syncing again.'
              : 'Unable to load Global Ranking.',
          );
        }
      },
    );

    return () => unsub();
  }, [authReady, user, onMergeCloudStats]);

  // Publish or Sync Local Progress to Firestore
  const syncMyStats = useCallback(
    async (customName?: string, customCity?: string, customBelt?: BeltDivision) => {
      if (!user) return;
      setSyncing(true);
      setErrorMessage(null);
      setSyncNotice(null);

      const docPath = `athlete_rankings/${user.uid}`;
      const docRef = doc(db, 'athlete_rankings', user.uid);

      const safeName = sanitizeString(
        customName ?? displayNameInput,
        user.displayName ? sanitizeString(user.displayName, 'PTF Athlete', 40) : 'PTF Athlete',
        40,
      );
      const safeCity = sanitizeString(customCity ?? clubCityInput, 'Islamabad', 40);
      const safeBelt: BeltDivision = customBelt ?? beltLevelInput;

      const localMinutes = clampInt(localProgress.totalMinutesTrained, 100000);
      const localReps = clampInt(localProgress.totalRepsLogged, 1000000);
      const localDrills = clampInt(localProgress.completedDrills.length, 500);
      const localTechs = clampInt(localProgress.practicedTechniques.length, 50);

      try {
        let snap;
        try {
          snap = await getDoc(docRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, docPath);
        }

        if (!snap || !snap.exists()) {
          try {
            await setDoc(docRef, {
              uid: user.uid,
              displayName: safeName,
              clubCity: safeCity,
              beltLevel: safeBelt,
              totalMinutesTrained: localMinutes,
              totalRepsLogged: localReps,
              completedDrillsCount: localDrills,
              practicedTechniquesCount: localTechs,
              isPublic: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, docPath);
          }
          setSyncNotice('Your local training stats are now live on the Global Ranking!');
        } else {
          const prev = snap.data() as AthleteRankingEntry;
          const mergedMinutes = Math.max(prev.totalMinutesTrained ?? 0, localMinutes);
          const mergedReps = Math.max(prev.totalRepsLogged ?? 0, localReps);
          const mergedDrills = Math.max(prev.completedDrillsCount ?? 0, localDrills);
          const mergedTechs = Math.max(prev.practicedTechniquesCount ?? 0, localTechs);

          try {
            await updateDoc(docRef, {
              displayName: safeName,
              clubCity: safeCity,
              beltLevel: safeBelt,
              totalMinutesTrained: mergedMinutes,
              totalRepsLogged: mergedReps,
              completedDrillsCount: mergedDrills,
              practicedTechniquesCount: mergedTechs,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, docPath);
          }
          setSyncNotice('Stats synced with the Global Ranking.');
        }
        setEditingProfile(false);
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? 'Failed to sync your ranking profile. Please verify your connection and retry.'
            : 'Sync failed.',
        );
      } finally {
        setSyncing(false);
      }
    },
    [
      user,
      displayNameInput,
      clubCityInput,
      beltLevelInput,
      localProgress,
    ],
  );

  // Auto-sync local progress whenever local stats grow while signed in & already published
  useEffect(() => {
    if (!user) return;
    const mine = entries.find((e) => e.uid === user.uid);
    if (!mine) return;
    if (
      localProgress.totalMinutesTrained > mine.totalMinutesTrained ||
      localProgress.totalRepsLogged > mine.totalRepsLogged ||
      localProgress.completedDrills.length > mine.completedDrillsCount ||
      localProgress.practicedTechniques.length > mine.practicedTechniquesCount
    ) {
      syncMyStats();
    }
  }, [
    user,
    entries,
    localProgress.totalMinutesTrained,
    localProgress.totalRepsLogged,
    localProgress.completedDrills.length,
    localProgress.practicedTechniques.length,
    syncMyStats,
  ]);

  const handleSignIn = async () => {
    setErrorMessage(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user?.displayName) {
        setDisplayNameInput(sanitizeString(cred.user.displayName, 'PTF Athlete', 40));
      }
    } catch {
      setErrorMessage('Sign-in was cancelled or blocked by popup settings.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSyncNotice(null);
  };

  // Global Sorted Ranking (before search/belt filtering so ranks reflect true global standing)
  const globallySorted = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => {
      const primaryDiff = b[sortBy] - a[sortBy];
      if (primaryDiff !== 0) return primaryDiff;
      const secondaryField: RankingSortField =
        sortBy === 'totalMinutesTrained' ? 'totalRepsLogged' : 'totalMinutesTrained';
      return b[secondaryField] - a[secondaryField];
    });
    return copy.map((item, idx) => ({ ...item, globalRank: idx + 1 }));
  }, [entries, sortBy]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return globallySorted.filter((row) => {
      const matchBelt = beltFilter === 'ALL' || row.beltLevel === beltFilter;
      const matchQuery =
        !q ||
        row.displayName.toLowerCase().includes(q) ||
        row.clubCity.toLowerCase().includes(q);
      return matchBelt && matchQuery;
    });
  }, [globallySorted, beltFilter, searchQuery]);

  const myCloudRow = useMemo(
    () => (user ? globallySorted.find((r) => r.uid === user.uid) ?? null : null),
    [globallySorted, user],
  );

  const myMinutes = Math.max(
    localProgress.totalMinutesTrained,
    myCloudRow?.totalMinutesTrained ?? 0,
  );
  const myReps = Math.max(
    localProgress.totalRepsLogged,
    myCloudRow?.totalRepsLogged ?? 0,
  );

  const topAthlete = globallySorted[0] ?? null;
  const avgMinutes =
    globallySorted.length > 0
      ? Math.round(
          globallySorted.reduce((s, e) => s + e.totalMinutesTrained, 0) /
            globallySorted.length,
        )
      : 0;
  const avgReps =
    globallySorted.length > 0
      ? Math.round(
          globallySorted.reduce((s, e) => s + e.totalRepsLogged, 0) /
            globallySorted.length,
        )
      : 0;

  return (
    <section
      id="global-ranking"
      className="py-16 sm:py-20 border-t border-slate-800/70"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        {/* Header & Auth / Sync Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-emerald-400">
              Pakistan Taekwondo Federation · Community Leaderboard
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">
              Global Athlete Ranking
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              Compare your local <strong className="text-white">Total Minutes Trained</strong> and{' '}
              <strong className="text-white">Total Reps</strong> against other Virtual Taekwondo
              athletes. Sign in with Google to publish your progress and track your live rank.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!user ? (
              <button
                type="button"
                onClick={handleSignIn}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in to Publish &amp; Compare</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => syncMyStats()}
                  disabled={syncing}
                  className="min-h-[42px] inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{myCloudRow ? 'Sync Local Stats' : 'Publish to Ranking'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingProfile((v) => !v)}
                  className="min-h-[42px] inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0B111E] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <UserCheck className="h-4 w-4 text-cyan-400" />
                  <span>{editingProfile ? 'Close Profile' : 'Edit Profile'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="min-h-[42px] inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inline Athlete Profile Editor (Non-PII Public Fields) */}
        {user && editingProfile && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              syncMyStats(displayNameInput, clubCityInput, beltLevelInput);
            }}
            className="mt-6 rounded-2xl border border-slate-800 bg-[#0B111E] p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label
                htmlFor="athlete-name"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Athlete Display Name
              </label>
              <input
                id="athlete-name"
                type="text"
                minLength={2}
                maxLength={40}
                required
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#070B12] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="athlete-city"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Club / City
              </label>
              <input
                id="athlete-city"
                list="ptf-cities"
                minLength={2}
                maxLength={40}
                required
                value={clubCityInput}
                onChange={(e) => setClubCityInput(e.target.value)}
                className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#070B12] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <datalist id="ptf-cities">
                {DEFAULT_CITIES.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="athlete-belt"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Belt Division
              </label>
              <select
                id="athlete-belt"
                value={beltLevelInput}
                onChange={(e) => setBeltLevelInput(e.target.value as BeltDivision)}
                className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#070B12] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="White / Yellow">White / Yellow</option>
                <option value="Green / Blue">Green / Blue</option>
                <option value="Red / Black">Red / Black</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={syncing}
              className="min-h-[40px] rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors"
            >
              {syncing ? 'Saving...' : 'Save & Sync Ranking'}
            </button>
          </form>
        )}

        {/* Notifications / Errors */}
        {syncNotice && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/25 px-4 py-3 text-xs sm:text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/25 px-4 py-3 text-xs sm:text-sm text-rose-200">
            {errorMessage}
          </div>
        )}

        {/* 3 Comparison Summary Cards (Local Progress vs. Global Cohort) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-slate-800 bg-[#0B111E] p-5">
            <div className="text-xs font-medium text-slate-400">
              Your Total Minutes Trained
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums text-white">
                {myMinutes} <span className="text-sm font-normal text-slate-400">min</span>
              </span>
              {topAthlete && (
                <span className="text-xs font-mono tabular-nums text-cyan-400">
                  Leader: {topAthlete.totalMinutesTrained} min
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {topAthlete
                ? `Global average: ${avgMinutes} min · ${
                    myMinutes >= avgMinutes
                      ? `${myMinutes - avgMinutes} min above average`
                      : `${avgMinutes - myMinutes} min to reach average`
                  }`
                : 'Complete guided drills above to add training minutes.'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B111E] p-5">
            <div className="text-xs font-medium text-slate-400">
              Your Total Reps Logged
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums text-emerald-400">
                {myReps} <span className="text-sm font-normal text-slate-400">reps</span>
              </span>
              {topAthlete && (
                <span className="text-xs font-mono tabular-nums text-cyan-400">
                  Leader: {topAthlete.totalRepsLogged} reps
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {topAthlete
                ? `Global average: ${avgReps} reps · ${
                    myReps >= avgReps
                      ? `${myReps - avgReps} reps above average`
                      : `${avgReps - myReps} reps to reach average`
                  }`
                : 'Tap "+ Log Rep" during drills to record technique reps.'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B111E] p-5">
            <div className="text-xs font-medium text-slate-400">
              Your Global Standing
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums text-amber-400">
                {myCloudRow
                  ? `#${myCloudRow.globalRank}`
                  : user
                    ? 'Unpublished'
                    : 'Local Only'}
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-300">
                {globallySorted.length} ranked athletes
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {myCloudRow
                ? `Ranked by ${
                    sortBy === 'totalMinutesTrained' ? 'Total Minutes Trained' : 'Total Reps'
                  } · ${myCloudRow.clubCity}`
                : user
                  ? 'Click "Publish to Ranking" to enter the leaderboard.'
                  : 'Sign in with Google to compare live with other athletes.'}
            </div>
          </div>
        </div>

        {/* Filter, Search & Sort Controls */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-[#0B111E] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Sort Mode Segmented Control */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1 rounded-lg bg-[#070B12] p-1 border border-slate-800">
                <span className="px-2 text-xs text-slate-400 inline-flex items-center gap-1">
                  <ArrowDownUp className="h-3.5 w-3.5" />
                  <span>Sort:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSortBy('totalMinutesTrained')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    sortBy === 'totalMinutesTrained'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Total Minutes Trained
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('totalRepsLogged')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    sortBy === 'totalRepsLogged'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Total Reps
                </button>
              </div>

              <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-[#070B12] p-1 border border-slate-800">
                {(['ALL', 'White / Yellow', 'Green / Blue', 'Red / Black'] as const).map(
                  (belt) => (
                    <button
                      key={belt}
                      type="button"
                      onClick={() => setBeltFilter(belt)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        beltFilter === belt
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {belt === 'ALL' ? 'All Belts' : belt}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search athlete or city..."
                aria-label="Search athlete or city"
                className="w-full min-h-[38px] rounded-lg border border-slate-800 bg-[#070B12] pl-9 pr-3 py-1.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* States: Signed Out / Loading / Empty / Populated */}
          {!user ? (
            <div className="p-8 sm:p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-white">
                Connect Your PTF Athlete Profile
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-slate-300">
                Your browser currently has{' '}
                <strong className="font-mono text-white tabular-nums">
                  {localProgress.totalMinutesTrained} min
                </strong>{' '}
                and{' '}
                <strong className="font-mono text-emerald-400 tabular-nums">
                  {localProgress.totalRepsLogged} reps
                </strong>{' '}
                saved locally. Sign in with Google to view the live Global Ranking and compare your
                training stats with athletes across Pakistan and worldwide.
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : loadingList ? (
            <div className="p-6 space-y-3" aria-busy="true">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-11 w-full rounded-lg bg-slate-800/40 animate-pulse"
                />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center">
              <Award className="mx-auto h-8 w-8 text-slate-500" />
              <h3 className="mt-3 font-display text-lg font-bold text-white">
                {entries.length === 0
                  ? 'No Ranked Athletes Yet'
                  : 'No Athletes Match Your Filter'}
              </h3>
              <p className="mt-1.5 text-sm text-slate-400">
                {entries.length === 0
                  ? 'Be the first athlete to publish your local training minutes and reps to the Global Ranking.'
                  : 'Try clearing the belt filter or city search query.'}
              </p>
              {entries.length === 0 ? (
                <button
                  type="button"
                  onClick={() => syncMyStats()}
                  className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Publish My Stats First
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBeltFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-4 text-xs font-semibold text-cyan-400 underline"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#070B12] text-xs font-semibold text-slate-400">
                    <th className="py-3 px-4 w-20">Rank</th>
                    <th className="py-3 px-4">Athlete</th>
                    <th className="py-3 px-4">Club / City</th>
                    <th className="py-3 px-4">Belt Division</th>
                    <th className="py-3 px-4 text-right">Minutes Trained</th>
                    <th className="py-3 px-4 text-right">Total Reps</th>
                    <th className="py-3 px-4 text-right">Drills</th>
                    <th className="py-3 px-4 text-right">vs. Your Stats</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-sm">
                  {filteredRows.map((row) => {
                    const isMe = row.uid === user.uid;
                    const metricDiff =
                      sortBy === 'totalMinutesTrained'
                        ? row.totalMinutesTrained - myMinutes
                        : row.totalRepsLogged - myReps;
                    const unit = sortBy === 'totalMinutesTrained' ? 'min' : 'reps';

                    return (
                      <tr
                        key={row.uid}
                        className={`transition-colors ${
                          isMe
                            ? 'bg-emerald-500/10 text-white'
                            : 'hover:bg-slate-900/60 text-slate-200'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold tabular-nums">
                          <span
                            className={
                              row.globalRank === 1
                                ? 'text-amber-400'
                                : row.globalRank <= 3
                                  ? 'text-cyan-300'
                                  : 'text-slate-400'
                            }
                          >
                            #{row.globalRank}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-medium">
                          <span>{row.displayName}</span>
                          {isMe && (
                            <span className="ml-2 text-xs font-semibold text-emerald-400">
                              (You)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-300">{row.clubCity}</td>
                        <td className="py-3 px-4 text-xs text-slate-400">{row.beltLevel}</td>

                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-white">
                          {row.totalMinutesTrained}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-cyan-300">
                          {row.totalRepsLogged}
                        </td>

                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                          {row.completedDrillsCount}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                          {isMe ? (
                            <span className="text-emerald-400 font-semibold">Current</span>
                          ) : metricDiff > 0 ? (
                            <span className="text-amber-300">
                              +{metricDiff} {unit} ahead
                            </span>
                          ) : metricDiff < 0 ? (
                            <span className="text-emerald-400">
                              {Math.abs(metricDiff)} {unit} behind you
                            </span>
                          ) : (
                            <span className="text-slate-400">Tied</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
