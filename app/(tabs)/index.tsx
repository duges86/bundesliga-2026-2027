// ČASŤ 1/10

import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL = 'duges86@gmail.com';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(userId: string) {
  if (!userId || Platform.OS === 'web') return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Bundesliga upozornenia',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const permission = await Notifications.requestPermissionsAsync();
      finalStatus = permission.status;
    }

    if (finalStatus !== 'granted') {
      console.log('Používateľ nepovolil push notifikácie.');
      return;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('EAS projectId nebolo nájdené.');
      return;
    }

    const expoPushToken = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,expo_push_token' }
      );

    if (error) {
      console.warn('Push token sa nepodarilo uložiť:', error.message);
    }
  } catch (error) {
    console.warn('Registrácia push notifikácií zlyhala:', error);
  }
}

const TEAM_LOGOS: Record<string, any> = {
  'FC Bayern München': require('../../assets/images/teams/Bayern Munich.png'),
  'VfB Stuttgart': require('../../assets/images/teams/VfB Stuttgart.png'),
  'Borussia Dortmund': require('../../assets/images/teams/Borussia Dortmund.png'),
  'Hamburger SV': require('../../assets/images/teams/Hamburger SV.png'),
  'RB Leipzig': require('../../assets/images/teams/RB Leipzig.png'),
  'Borussia Mönchengladbach': require('../../assets/images/teams/Borussia Mönchengladbach.png'),
  'Sport-Club Freiburg': require('../../assets/images/teams/SC Freiburg.png'),
  'SC Freiburg': require('../../assets/images/teams/SC Freiburg.png'),
  'SV Werder Bremen': require('../../assets/images/teams/SV Werder Bremen.png'),
  'FC Augsburg': require('../../assets/images/teams/FC Augsburg.png'),
  'FC Schalke 04': require('../../assets/images/teams/FC Schalke 04.png'),
  '1. FSV Mainz 05': require('../../assets/images/teams/1.FSV Mainz 05.png'),
  'SC Paderborn 07': require('../../assets/images/teams/SC Paderborn 07.png'),
  '1. FC Union Berlin': require('../../assets/images/teams/1.FC Union Berlin.png'),
  'Eintracht Frankfurt': require('../../assets/images/teams/Eintracht Frankfurt.png'),
  '1. FC Köln': require('../../assets/images/teams/1.FC Köln.png'),
  'TSG Hoffenheim': require('../../assets/images/teams/TSG 1899 Hoffenheim.png'),
  'SV Elversberg': require('../../assets/images/teams/SV 07 Elversberg.png'),
  'Bayer 04 Leverkusen': require('../../assets/images/teams/Bayer 04 Leverkusen.png'),
};

function getTeamLogo(team: string) {
  return TEAM_LOGOS[team] || null;
}

function getResultType(home: number, away: number) {
  if (home > away) return 'HOME';
  if (home < away) return 'AWAY';
  return 'DRAW';
}

function calculateStandardPoints(
  tipHome: number,
  tipAway: number,
  realHome: number,
  realAway: number
) {
  if (tipHome === realHome && tipAway === realAway) return 3;

  if (
    getResultType(tipHome, tipAway) ===
    getResultType(realHome, realAway)
  ) {
    return 1;
  }

  return 0;
}

function getDateKey(dateString: string) {
  return new Date(dateString).toISOString().slice(0, 10);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateString?: string | null) {
  if (!dateString) return 'Termín bude doplnený';

  return new Date(dateString).toLocaleString('sk-SK', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
// ČASŤ 2/10

export default function HomeScreen() {
  const [session, setSession] = useState<any>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [matches, setMatches] = useState<any[]>([]);
  const [myTips, setMyTips] = useState<any>({});
  // Posledná potvrdená verzia tipu zo Supabase.
  // Vďaka tomu vieme rozlíšiť ULOŽENÉ vs. ZMENENÉ – NEULOŽENÉ.
  const [savedTips, setSavedTips] = useState<any>({});
  const [savingTips, setSavingTips] = useState<Record<string, boolean>>({});
  const [allTips, setAllTips] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const [isResetMode, setIsResetMode] = useState(false);
const [newPassword, setNewPassword] = useState('');

  const [message, setMessage] = useState('');
  const [matchMessages, setMatchMessages] = useState<any>({});

  const [mainView, setMainView] = useState<
  'UPCOMING' |
  'HISTORY' |
  'TABLES' |
  'STATS' |
  'PROFILE'
>('UPCOMING'); 


  const [newHomeTeam, setNewHomeTeam] = useState('');
  const [newAwayTeam, setNewAwayTeam] = useState('');
  const [newKickoff, setNewKickoff] = useState('');
  const [newRoundNumber, setNewRoundNumber] = useState('1');
  const [selectedRound, setSelectedRound] = useState<number | 'ALL'>('ALL');

  // Najbližšie: zobrazujeme iba jedno kolo naraz.
  // Namiesto stoviek kariet je na obrazovke maximálne 9 zápasov.
  const [selectedUpcomingRound, setSelectedUpcomingRound] =
    useState<number | null>(null);

  const [resultInputs, setResultInputs] = useState<any>({});
  const [editInputs, setEditInputs] = useState<any>({});
// ČASŤ 3/10

  useEffect(() => {
    start();

   const { data } = supabase.auth.onAuthStateChange(
  (event, session) => {
    setSession(session);

    if (event === 'PASSWORD_RECOVERY') {
      setIsResetMode(true);
    }

    if (
      session &&
      event !== 'INITIAL_SESSION'
    ) {
      const isRecovery =
        window?.location?.href?.includes('type=recovery');

      if (isRecovery) {
        setIsResetMode(true);
      }
    }

    if (session) {
      loadAfterLogin(session.user.id);
    }
  }
);

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  // Kliknutie na notifikáciu otvorí rovno správnu časť appky.
  useEffect(() => {
    const openFromNotification = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;

      const data = response.notification.request.content.data as any;
      const round = Number(data?.round);

      if (data?.view === 'TABLES') {
        if (Number.isFinite(round)) setSelectedRound(round);
        setMainView('TABLES');
      }

      if (data?.view === 'UPCOMING') {
        if (Number.isFinite(round)) setSelectedUpcomingRound(round);
        setMainView('UPCOMING');
      }
    };

    Notifications.getLastNotificationResponseAsync()
      .then(openFromNotification)
      .catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener(
      openFromNotification
    );

    return () => subscription.remove();
  }, []);

  const start = async () => {
    const { data } = await supabase.auth.getSession();

    setSession(data.session);

    if (data.session) {
      await loadAfterLogin(data.session.user.id);
    }
  };

  const loadAfterLogin = async (userId: string) => {
    await loadProfile(userId);
    await loadProfiles();
    await loadMatches();
    await loadMyTips(userId);
    await loadAllTips();

    // Push token registrujeme na pozadí po prihlásení.
    // Ak používateľ notifikácie nepovolí, zvyšok appky funguje normálne.
    void registerForPushNotifications(userId);
  };

  const register = async () => {
    const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'bundesliga20262027://',
  },
});

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Registrácia úspešná. Skontroluj e-mail.');
    }
  };

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Prihlásenie úspešné.');
    }
  };

  const resetPassword = async () => {
  if (email.trim() === '') {
    setMessage('Zadaj email.');
    return;
  }

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
       redirectTo: 'bundesliga20262027://reset-password',
      }
    );

  if (error) {
    setMessage(error.message);
  } else {
    setMessage(
      '✅ Na email bol odoslaný odkaz na zmenu hesla.'
    );
  }
};

const updatePassword = async () => {
  if (newPassword.trim().length < 6) {
    setMessage('Heslo musí mať aspoň 6 znakov.');
    return;
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword.trim(),
  });

  if (error) {
    setMessage(error.message);
    return;
  }

  setIsResetMode(false);
  setNewPassword('');
  setMessage('✅ Heslo bolo zmenené. Môžeš sa prihlásiť.');
  await supabase.auth.signOut();
};

  const logout = async () => {
    await supabase.auth.signOut();

    setSession(null);
    setUsername('');
    setUsernameInput('');
    setNewUsername('');
    setMatches([]);
    setMyTips({});
    setAllTips([]);
    setMatchMessages({});
  };
// ČASŤ 4/10

  const loadProfile = async (userId: string) => {
    setProfileLoaded(false);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setProfileLoaded(true);
      return;
    }

    if (data) {
      setUsername(data.username || '');
      setNewUsername(data.username || '');
    } else {
      setUsername('');
      setUsernameInput('');
      setNewUsername('');
    }

    setProfileLoaded(true);
  };

  const saveProfile = async () => {
    if (!session) return;

    if (usernameInput.trim() === '') {
      setMessage('Meno je povinné. Zadaj meno hráča.');
      return;
    }

    const { error } = await supabase.from('profiles').insert({
      id: session.user.id,
      username: usernameInput.trim(),
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setUsername(usernameInput.trim());
    setNewUsername(usernameInput.trim());
    setMessage('✅ Meno uložené');
  };

  const updateUsername = async () => {
    if (!session) return;

    if (newUsername.trim() === '') {
      setMessage('Meno nemôže byť prázdne.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        username: newUsername.trim(),
      })
      .eq('id', session.user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setUsername(newUsername.trim());
    setMessage('✅ Meno bolo zmenené');
  };
// ČASŤ 5/10

// ČASŤ 6/10



  const loadMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('id, home_team, away_team, kickoff_at, home_score, away_score, round_number')
      .order('kickoff_at', {
        ascending: true,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMatches(data || []);

    const editObject: any = {};

    data?.forEach((match) => {
      editObject[match.id] = {
        home_team: match.home_team || '',
        away_team: match.away_team || '',
        kickoff_at: match.kickoff_at || '',
        round_number: String(match.round_number || 1),
      };
    });

    setEditInputs(editObject);
  };

  const loadMyTips = async (userId: string) => {
    const { data, error } = await supabase
      .from('predictions')
      .select('id, match_id, user_id, home_tip, away_tip, points')
      .eq('user_id', userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    const tipsObject: any = {};

    data?.forEach((tip) => {
      tipsObject[tip.match_id] = {
        home: String(tip.home_tip),
        away: String(tip.away_tip),
      };
    });

    setMyTips(tipsObject);
    setSavedTips(tipsObject);
  };

 const loadAllTips = async () => {
  let allTipsData: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('predictions')
      .select('id, match_id, user_id, home_tip, away_tip, points')
      .range(from, from + pageSize - 1);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data || data.length === 0) {
      break;
    }

    allTipsData = [...allTipsData, ...data];

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  setAllTips(allTipsData);
};
  const loadProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username');

  if (error) {
    setMessage(error.message);
    return;
  }

  setProfiles(data || []);
};
// ČASŤ 7/10



  const updateTip = (
    matchId: string,
    field: 'home' | 'away',
    value: string
  ) => {
    setMyTips((prev: any) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value,
      },
    }));

    setMatchMessages((prev: any) => {
      if (!prev[matchId]) return prev;
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
  };

  const updateResultInput = (
    matchId: string,
    field: 'home' | 'away',
    value: string
  ) => {
    setResultInputs((prev: any) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value,
      },
    }));
  };

  const updateEditInput = (
    matchId: string,
    field: 'home_team' | 'away_team' | 'kickoff_at' | 'round_number',
    value: string
  ) => {
    setEditInputs((prev: any) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value,
      },
    }));
  };

  const saveTip = async (matchId: string) => {
    if (!session || savingTips[matchId]) return;

    const tip = myTips[matchId];

    if (!tip || tip.home === '' || tip.away === '') {
      setMatchMessages((prev: any) => ({
        ...prev,
        [matchId]: '⚠️ Najprv vyplň oba výsledky.',
      }));
      return;
    }

    const match = matches.find((item) => item.id === matchId);

    if (!match) {
      setMatchMessages((prev: any) => ({
        ...prev,
        [matchId]: '⚠️ Zápas sa nenašiel.',
      }));
      return;
    }

    if (!match.kickoff_at) {
      setMatchMessages((prev: any) => ({
        ...prev,
        [matchId]: '⚠️ Termín zápasu ešte nie je určený.',
      }));
      return;
    }

    if (new Date() >= new Date(match.kickoff_at)) {
      setMatchMessages((prev: any) => ({
        ...prev,
        [matchId]: '⚠️ Tento zápas je už uzavretý.',
      }));
      return;
    }

    const homeTip = Number(tip.home);
    const awayTip = Number(tip.away);

    setSavingTips((prev) => ({ ...prev, [matchId]: true }));
    setMatchMessages((prev: any) => ({
      ...prev,
      [matchId]: '⏳ Ukladám...',
    }));

    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        {
          match_id: matchId,
          user_id: session.user.id,
          home_tip: homeTip,
          away_tip: awayTip,
        },
        { onConflict: 'match_id,user_id' }
      )
      .select('id, match_id, user_id, home_tip, away_tip, points')
      .single();

    setSavingTips((prev) => ({ ...prev, [matchId]: false }));

    if (error) {
      setMatchMessages((prev: any) => ({
        ...prev,
        [matchId]: `❌ ${error.message}`,
      }));
      return;
    }

    const saved = {
      home: String(homeTip),
      away: String(awayTip),
    };

    // Okamžitá lokálna aktualizácia – po jednom uložení už nesťahujeme
    // znovu všetky moje tipy ani všetky tipy všetkých hráčov.
    setSavedTips((prev: any) => ({
      ...prev,
      [matchId]: saved,
    }));

    setMyTips((prev: any) => ({
      ...prev,
      [matchId]: saved,
    }));

    if (data) {
      setAllTips((prev: any[]) => {
        const index = prev.findIndex(
          (item) =>
            item.match_id === matchId &&
            item.user_id === session.user.id
        );

        if (index === -1) {
          return [...prev, data];
        }

        const next = [...prev];
        next[index] = data;
        return next;
      });
    }

    setMatchMessages((prev: any) => ({
      ...prev,
      [matchId]: `✅ ULOŽENÉ ${homeTip} : ${awayTip}`,
    }));
  };
// ČASŤ 8/10



  const saveResult = async (matchId: string) => {
    const result = resultInputs[matchId];

    if (!result || result.home === '' || result.away === '') {
      setMessage('Vyplň oba góly.');
      return;
    }

    const homeScore = Number(result.home);
    const awayScore = Number(result.away);

    const { error } = await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
      })
      .eq('id', matchId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMatchMessages((prev: any) => ({
      ...prev,
      [matchId]: '✅ Výsledok uložený',
    }));

    setResultInputs((prev: any) => ({
      ...prev,
      [matchId]: {
        home: '',
        away: '',
      },
    }));

    await loadMatches();
    await loadAllTips();
  };
// ČASŤ 9/10

  const saveEditMatch = async (matchId: string) => {
    const edit = editInputs[matchId];

    if (
      !edit ||
      edit.home_team.trim() === '' ||
      edit.away_team.trim() === ''
    ) {
      setMessage('Vyplň oba tímy.');
      return;
    }

    const { error } = await supabase
      .from('matches')
      .update({
        home_team: edit.home_team.trim(),
        away_team: edit.away_team.trim(),
        kickoff_at: edit.kickoff_at?.trim() ? edit.kickoff_at.trim() : null,
        round_number: Number(edit.round_number || 1),
      })
      .eq('id', matchId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMatchMessages((prev: any) => ({
      ...prev,
      [matchId]: '✅ Zápas upravený',
    }));

    await loadMatches();
  };

  const deleteMatch = async (matchId: string) => {
    await supabase
      .from('predictions')
      .delete()
      .eq('match_id', matchId);

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('✅ Zápas zmazaný');

    await loadMatches();
    await loadAllTips();
  };

  const addMatch = async () => {
    if (!newHomeTeam || !newAwayTeam) {
      setMessage('Vyplň oba tímy.');
      return;
    }

    const { error } = await supabase
      .from('matches')
      .insert({
        home_team: newHomeTeam,
        away_team: newAwayTeam,
        kickoff_at: newKickoff.trim() ? newKickoff.trim() : null,
        round_number: Number(newRoundNumber || 1),
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setNewHomeTeam('');
    setNewAwayTeam('');
    setNewKickoff('');
    setNewRoundNumber('1');

    setMessage('✅ Zápas pridaný');

    await loadMatches();
  };

  const isAdmin =
    session?.user?.email === ADMIN_EMAIL;
// ČASŤ 10/10

  const upcomingMatches = useMemo(() => {
    return matches.filter(
      (match) => match.home_score === null || match.away_score === null
    );
  }, [matches]);

  const playedMatches = useMemo(() => {
    return matches.filter(
      (match) => match.home_score !== null && match.away_score !== null
    );
  }, [matches]);

  const allRounds = useMemo(() => {
    return Array.from(
      new Set(matches.map((match) => Number(match.round_number || 1)))
    ).sort((a, b) => a - b);
  }, [matches]);

  const nextRound = useMemo(() => {
    const upcomingRounds = Array.from(
      new Set(upcomingMatches.map((match) => Number(match.round_number || 1)))
    ).sort((a, b) => a - b);
    return upcomingRounds[0] ?? null;
  }, [upcomingMatches]);

  // Kolo je kompletne vyhodnotené až vtedy, keď majú výsledok všetky jeho zápasy.
  const completedRounds = useMemo(() => {
    return allRounds
      .filter((round) => {
        const roundMatches = matches.filter(
          (match) => Number(match.round_number || 1) === round
        );

        return (
          roundMatches.length > 0 &&
          roundMatches.every(
            (match) => match.home_score !== null && match.away_score !== null
          )
        );
      })
      .sort((a, b) => b - a);
  }, [allRounds, matches]);

  const latestCompletedRound = completedRounds[0] ?? null;

  // Posledné kompletne vyhodnotené kolo ostáva vľavo.
  // Až po vyhodnotení ďalšieho kola sa staršie kolo presunie doprava.
  // Príklad: po 1. kole = 1,2,3...; po 2. kole = 2,3,4...,1.
  const roundOrder = useMemo(() => {
    if (latestCompletedRound === null) {
      return [...allRounds].sort((a, b) => a - b);
    }

    const future = allRounds
      .filter((round) => round > latestCompletedRound)
      .sort((a, b) => a - b);

    const older = allRounds
      .filter((round) => round < latestCompletedRound)
      .sort((a, b) => b - a);

    return [latestCompletedRound, ...future, ...older];
  }, [allRounds, latestCompletedRound]);

  const playedRounds = useMemo(() => {
    const rounds = Array.from(
      new Set(playedMatches.map((match) => Number(match.round_number || 1)))
    ).sort((a, b) => b - a);

    // História má tiež najnovšie vyhodnotené kolo úplne vľavo.
    if (latestCompletedRound === null || !rounds.includes(latestCompletedRound)) {
      return rounds;
    }

    return [
      latestCompletedRound,
      ...rounds.filter((round) => round !== latestCompletedRound),
    ];
  }, [playedMatches, latestCompletedRound]);

  const upcomingRounds = useMemo(() => {
    return Array.from(
      new Set(upcomingMatches.map((match) => Number(match.round_number || 1)))
    ).sort((a, b) => {
      if (nextRound !== null) {
        if (a === nextRound) return -1;
        if (b === nextRound) return 1;
      }
      return a - b;
    });
  }, [upcomingMatches, nextRound]);

  useEffect(() => {
    if (upcomingRounds.length === 0) {
      setSelectedUpcomingRound(null);
      return;
    }

    setSelectedUpcomingRound((current) => {
      if (current !== null && upcomingRounds.includes(current)) {
        return current;
      }

      return nextRound ?? upcomingRounds[0];
    });
  }, [upcomingRounds, nextRound]);

  const selectedUpcomingMatches = useMemo(() => {
    if (selectedUpcomingRound === null) return [];

    return upcomingMatches.filter(
      (match) => Number(match.round_number || 1) === selectedUpcomingRound
    );
  }, [upcomingMatches, selectedUpcomingRound]);

  const roundTipSummary = useMemo(() => {
    const result = new Map<number, {
      total: number;
      saved: number;
      missing: number;
      matches: any[];
    }>();

    upcomingRounds.forEach((round) => {
      const roundMatches = upcomingMatches.filter(
        (match) => Number(match.round_number || 1) === round
      );

      // Do kontroly rátame len zápasy s určeným termínom.
      // Zápas bez termínu sa ešte nedá tipovať.
      const tipableMatches = roundMatches.filter((match) => Boolean(match.kickoff_at));

      const saved = tipableMatches.filter((match) => {
        const tip = savedTips[match.id];
        return tip && tip.home !== '' && tip.away !== '';
      }).length;

      result.set(round, {
        total: tipableMatches.length,
        saved,
        missing: Math.max(0, tipableMatches.length - saved),
        matches: roundMatches,
      });
    });

    return result;
  }, [upcomingRounds, upcomingMatches, savedTips]);

  const tableMatches = useMemo(() => {
    if (selectedRound === 'ALL') return playedMatches;
    return playedMatches.filter(
      (match) => Number(match.round_number || 1) === selectedRound
    );
  }, [playedMatches, selectedRound]);

  const historyMatches = useMemo(() => {
    if (selectedRound === 'ALL') return playedMatches;
    return playedMatches.filter(
      (match) => Number(match.round_number || 1) === selectedRound
    );
  }, [playedMatches, selectedRound]);

  // Rýchle indexy – namiesto opakovaných filter/find cez všetky tipy.
  const profileNameById = useMemo(() => {
    const result = new Map<string, string>();
    profiles.forEach((profile) => {
      result.set(profile.id, profile.username || 'Hráč');
    });
    return result;
  }, [profiles]);

  const tipsByMatch = useMemo(() => {
    const result = new Map<string, any[]>();
    allTips.forEach((tip) => {
      const list = result.get(tip.match_id);
      if (list) {
        list.push(tip);
      } else {
        result.set(tip.match_id, [tip]);
      }
    });
    return result;
  }, [allTips]);

  const tipsByUser = useMemo(() => {
    const result = new Map<string, any[]>();
    allTips.forEach((tip) => {
      const list = result.get(tip.user_id);
      if (list) {
        list.push(tip);
      } else {
        result.set(tip.user_id, [tip]);
      }
    });
    return result;
  }, [allTips]);

  const tipByUserAndMatch = useMemo(() => {
    const result = new Map<string, Map<string, any>>();
    allTips.forEach((tip) => {
      let userMap = result.get(tip.user_id);
      if (!userMap) {
        userMap = new Map<string, any>();
        result.set(tip.user_id, userMap);
      }
      userMap.set(tip.match_id, tip);
    });
    return result;
  }, [allTips]);

  const playedMatchById = useMemo(() => {
    const result = new Map<string, any>();
    playedMatches.forEach((match) => result.set(match.id, match));
    return result;
  }, [playedMatches]);

  const playedMatchesByRound = useMemo(() => {
    const result = new Map<number, any[]>();
    playedMatches.forEach((match) => {
      const round = Number(match.round_number || 1);
      const list = result.get(round);
      if (list) {
        list.push(match);
      } else {
        result.set(round, [match]);
      }
    });
    return result;
  }, [playedMatches]);

  const buildStandingsForMatches = (
    matchesForTable: any[],
    profilesList: any[],
    tipIndex: Map<string, Map<string, any>>
  ) => {
    return profilesList
      .map((profile) => {
        const userTips = tipIndex.get(profile.id);
        let exactTips = 0;
        let onePointTips = 0;

        matchesForTable.forEach((match) => {
          const tip = userTips?.get(match.id);
          if (!tip) return;

          const points = calculateStandardPoints(
            Number(tip.home_tip),
            Number(tip.away_tip),
            Number(match.home_score),
            Number(match.away_score)
          );

          if (points === 3) exactTips += 1;
          if (points === 1) onePointTips += 1;
        });

        const truthTable = exactTips + onePointTips;
        const points = exactTips * 3 + onePointTips;

        return {
          userId: profile.id,
          name: profile.username || 'Hráč',
          exactTips,
          onePointTips,
          truthTable,
          points,
        };
      })
      .filter((player) => player.exactTips > 0 || player.onePointTips > 0)
      .sort((a, b) =>
        b.points - a.points ||
        b.exactTips - a.exactTips ||
        b.truthTable - a.truthTable ||
        a.name.localeCompare(b.name, 'sk')
      );
  };

  const activeStandings = useMemo(
    () => buildStandingsForMatches(tableMatches, profiles, tipByUserAndMatch),
    [tableMatches, profiles, tipByUserAndMatch]
  );

  const roundStandings = useMemo(() => {
    const result: Record<number, any[]> = {};
    playedRounds.forEach((round) => {
      result[round] = buildStandingsForMatches(
        playedMatchesByRound.get(round) || [],
        profiles,
        tipByUserAndMatch
      );
    });
    return result;
  }, [playedRounds, playedMatchesByRound, profiles, tipByUserAndMatch]);

  const playerStats = useMemo(() => {
    return profiles
      .map((profile) => {
        const playerTips = tipsByUser.get(profile.id) || [];
        let exactResults = 0;
        let onePointTips = 0;
        let evaluatedTips = 0;
        let totalPoints = 0;
        let bestRound = 0;
        let bestRoundPoints = 0;
        let wonRounds = 0;

        playerTips.forEach((tip) => {
          const match = playedMatchById.get(tip.match_id);
          if (!match) return;

          evaluatedTips += 1;
          const points = calculateStandardPoints(
            Number(tip.home_tip),
            Number(tip.away_tip),
            Number(match.home_score),
            Number(match.away_score)
          );
          totalPoints += points;
          if (points === 3) exactResults += 1;
          if (points === 1) onePointTips += 1;
        });

        playedRounds.forEach((round) => {
          const standings = roundStandings[round] || [];
          const player = standings.find((item) => item.userId === profile.id);
          const roundPoints = player?.points || 0;

          if (roundPoints > bestRoundPoints) {
            bestRoundPoints = roundPoints;
            bestRound = round;
          }

          if (
            standings.length > 0 &&
            roundPoints > 0 &&
            roundPoints === standings[0].points
          ) {
            wonRounds += 1;
          }
        });

        const successRate =
          evaluatedTips === 0
            ? 0
            : Math.round((exactResults / evaluatedTips) * 100);

        return {
          userId: profile.id,
          name: profile.username || 'Hráč',
          tips: playerTips.length,
          evaluatedTips,
          exactResults,
          onePointTips,
          successRate,
          truthTable: exactResults + onePointTips,
          totalPoints,
          bestRound,
          bestRoundPoints,
          wonRounds,
        };
      })
      .sort((a, b) =>
        b.totalPoints - a.totalPoints ||
        b.exactResults - a.exactResults ||
        b.truthTable - a.truthTable ||
        a.name.localeCompare(b.name, 'sk')
      );
  }, [profiles, tipsByUser, playedMatchById, playedRounds, roundStandings]);

  const renderMatchCard = (match: any) => {
    const hasKickoff = Boolean(match.kickoff_at);
    const isLocked =
      hasKickoff && new Date() >= new Date(match.kickoff_at);

    const tip = myTips[match.id];
    const savedTip = savedTips[match.id];
    const isSavingTip = Boolean(savingTips[match.id]);
    const hasSavedTip =
      Boolean(savedTip) &&
      savedTip.home !== '' &&
      savedTip.away !== '';
    const isTipDirty =
      Boolean(tip) &&
      tip.home !== '' &&
      tip.away !== '' &&
      (
        !savedTip ||
        String(tip.home) !== String(savedTip.home) ||
        String(tip.away) !== String(savedTip.away)
      );

    const hasResult =
      match.home_score !== null &&
      match.away_score !== null;

    const tipsForThisMatch = tipsByMatch.get(match.id) || [];

    return (
      <View key={match.id} style={styles.matchCard}>
        <Text style={styles.matchStatus}>
          {hasResult
            ? 'ODOHRANÉ'
            : !hasKickoff
              ? 'TERMÍN NEURČENÝ'
              : isLocked
                ? 'UZAVRETÉ'
                : 'OTVORENÉ'}
        </Text>

        <View style={styles.teamsRow}>
          <View style={styles.teamSide}>
            {getTeamLogo(match.home_team) && (
              <Image
                source={getTeamLogo(match.home_team)}
                style={styles.teamLogo}
                resizeMode="contain"
              />
            )}
            <Text style={styles.teamName}>{match.home_team}</Text>
          </View>

          <Text style={styles.vs}>vs</Text>

          <View style={styles.teamSide}>
            {getTeamLogo(match.away_team) && (
              <Image
                source={getTeamLogo(match.away_team)}
                style={styles.teamLogo}
                resizeMode="contain"
              />
            )}
            <Text style={styles.teamName}>{match.away_team}</Text>
          </View>
        </View>

        <Text style={styles.kickoff}>{formatTime(match.kickoff_at)}</Text>

        {hasResult && (
          <View style={styles.resultBox}>
            <Text style={styles.resultScore}>
              {match.home_score} : {match.away_score}
            </Text>
          </View>
        )}

        {isAdmin && (
          <View style={styles.adminResultBox}>
            <Text style={styles.adminSubtitle}>Zadať výsledok</Text>

            <View style={styles.tipRow}>
              <TextInput
                style={styles.inputScore}
                keyboardType="numeric"
                placeholder="0"
                value={resultInputs[match.id]?.home || ''}
                onChangeText={(text) =>
                  updateResultInput(match.id, 'home', text)
                }
              />

              <Text style={styles.colon}>:</Text>

              <TextInput
                style={styles.inputScore}
                keyboardType="numeric"
                placeholder="0"
                value={resultInputs[match.id]?.away || ''}
                onChangeText={(text) =>
                  updateResultInput(match.id, 'away', text)
                }
              />
            </View>

            <Pressable
              style={styles.smallButton}
              onPress={() => saveResult(match.id)}
            >
              <Text style={styles.smallButtonText}>Uložiť výsledok</Text>
            </Pressable>

            {matchMessages[match.id] && (
              <View style={styles.successBoxSmall}>
                <Text style={styles.successText}>
                  {matchMessages[match.id]}
                </Text>
              </View>
            )}

            <Text style={styles.adminSubtitle}>Upraviť zápas</Text>

            <TextInput
              style={styles.inputFull}
              placeholder="Domáci tím"
              value={editInputs[match.id]?.home_team || ''}
              onChangeText={(text) =>
                updateEditInput(match.id, 'home_team', text)
              }
            />

            <TextInput
              style={styles.inputFull}
              placeholder="Hostia"
              value={editInputs[match.id]?.away_team || ''}
              onChangeText={(text) =>
                updateEditInput(match.id, 'away_team', text)
              }
            />

            <TextInput
              style={styles.inputFull}
              placeholder="Výkop (môže zostať prázdny)"
              value={editInputs[match.id]?.kickoff_at || ''}
              onChangeText={(text) =>
                updateEditInput(match.id, 'kickoff_at', text)
              }
            />

            <TextInput
              style={styles.inputFull}
              placeholder="Číslo kola"
              value={editInputs[match.id]?.round_number || '1'}
              onChangeText={(text) =>
                updateEditInput(match.id, 'round_number', text)
              }
              keyboardType="numeric"
            />

            <Pressable
              style={styles.smallButton}
              onPress={() => saveEditMatch(match.id)}
            >
              <Text style={styles.smallButtonText}>
                Uložiť úpravu zápasu
              </Text>
            </Pressable>

            <Pressable
              style={styles.deleteButton}
              onPress={() => deleteMatch(match.id)}
            >
              <Text style={styles.deleteButtonText}>🗑 Zmazať zápas</Text>
            </Pressable>
          </View>
        )}

        {!hasResult && !hasKickoff && (
          <Text style={styles.notice}>
            Termín zápasu ešte nie je určený. Tipovanie sa otvorí po doplnení dátumu a času výkopu.
          </Text>
        )}

        {!hasResult && hasKickoff && !isLocked && (
          <>
            <Text style={styles.subheading}>Tvoj tip</Text>

            <View style={styles.tipRow}>
              <TextInput
                style={styles.inputScore}
                keyboardType="numeric"
                value={tip?.home || ''}
                onChangeText={(text) => updateTip(match.id, 'home', text)}
                placeholder="0"
              />

              <Text style={styles.colon}>:</Text>

              <TextInput
                style={styles.inputScore}
                keyboardType="numeric"
                value={tip?.away || ''}
                onChangeText={(text) => updateTip(match.id, 'away', text)}
                placeholder="0"
              />
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                isSavingTip && styles.disabledButton,
              ]}
              disabled={isSavingTip}
              onPress={() => saveTip(match.id)}
            >
              <Text style={styles.primaryButtonText}>
                {isSavingTip ? 'Ukladám...' : 'Uložiť tip'}
              </Text>
            </Pressable>

            {isTipDirty && !isSavingTip && (
              <View style={styles.unsavedBoxSmall}>
                <Text style={styles.unsavedText}>
                  ⚠️ ZMENENÉ – NEULOŽENÉ
                </Text>
              </View>
            )}

            {!isTipDirty && hasSavedTip && !matchMessages[match.id] && (
              <View style={styles.successBoxSmall}>
                <Text style={styles.successText}>
                  ✅ ULOŽENÉ {savedTip.home} : {savedTip.away}
                </Text>
              </View>
            )}

            {matchMessages[match.id] && (
              <View
                style={
                  matchMessages[match.id].startsWith('❌') ||
                  matchMessages[match.id].startsWith('⚠️')
                    ? styles.unsavedBoxSmall
                    : styles.successBoxSmall
                }
              >
                <Text
                  style={
                    matchMessages[match.id].startsWith('❌') ||
                    matchMessages[match.id].startsWith('⚠️')
                      ? styles.unsavedText
                      : styles.successText
                  }
                >
                  {matchMessages[match.id]}
                </Text>
              </View>
            )}

            <Text style={styles.notice}>
              Tipy ostatných budú viditeľné až po výkope.
            </Text>
          </>
        )}

        {(hasResult || isLocked) && (
          <>
            <Text style={styles.savedTip}>
              Tvoj tip: {tip?.home || '-'} : {tip?.away || '-'}
            </Text>

            <Text style={styles.subheading}>Tipy hráčov</Text>

            {tipsForThisMatch.length === 0 ? (
              <Text style={styles.notice}>Zatiaľ nie sú žiadne tipy.</Text>
            ) : (
              tipsForThisMatch.map((item) => {
                const points = hasResult
                  ? calculateStandardPoints(
                      Number(item.home_tip),
                      Number(item.away_tip),
                      Number(match.home_score),
                      Number(match.away_score)
                    )
                  : null;

                return (
                  <View key={item.id} style={styles.tipLine}>
                    <Text style={styles.tipPlayer}>
                      {profileNameById.get(item.user_id) ||
                        (item.user_id === session.user.id
                          ? username || 'Ja'
                          : 'Hráč')}
                    </Text>

                    <Text style={styles.tipScore}>
                      {item.home_tip} : {item.away_tip}
                    </Text>

                    <Text style={styles.tipPoints}>
                      {points === null ? '-' : `${points} b.`}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}
      </View>
    );
  };
  if (isResetMode) {
  return (
    <View style={styles.authContainer}>
      <View style={styles.authCard}>
        <Text style={styles.logo}>🔑</Text>
        <Text style={styles.authTitle}>Nové heslo</Text>

        <Text style={styles.authSubtitle}>
          Zadaj nové heslo k účtu.
        </Text>

        <TextInput
          style={styles.inputFull}
          placeholder="Nové heslo"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />

        <Pressable
          style={styles.primaryButton}
          onPress={updatePassword}
        >
          <Text style={styles.primaryButtonText}>
            Uložiť nové heslo
          </Text>
        </Pressable>
        {message !== '' && (
  <View
    style={
      message.includes('✅')
        ? styles.successBox
        : styles.errorBox
    }
  >
    <Text
      style={
        message.includes('✅')
          ? styles.successText
          : styles.errorText
      }
    >
      {message}
    </Text>
  </View>
)}
      </View>
    </View>
  );
}
// ČASŤ 11/12

  if (!session) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authCard}>
          <Text style={styles.logo}>🏆</Text>
          <Text style={styles.authTitle}>Nemecká Bundesliga</Text>
          <Text style={styles.authSeason}>2026/2027</Text>
          <Text style={styles.authSubtitle}>
            Tipovačka presných výsledkov
          </Text>

          <TextInput
            style={styles.inputFull}
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.inputFull}
            placeholder="Heslo"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable style={styles.primaryButton} onPress={login}>
            <Text style={styles.primaryButtonText}>Prihlásiť sa</Text>
          </Pressable>

          <Pressable style={styles.outlineButton} onPress={register}>
            <Text style={styles.outlineButtonText}>Registrovať sa</Text>
          </Pressable>
          <Pressable
  style={styles.outlineButton}
  onPress={resetPassword}
>
  <Text style={styles.outlineButtonText}>
    🔑 Zabudol som heslo
  </Text>
</Pressable>

<Pressable
  style={styles.outlineButton}
  onPress={() => setIsResetMode(true)}
>
  <Text style={styles.outlineButtonText}>
    🔑 Zadať nové heslo
  </Text>
</Pressable>

          {message !== '' && (
            <View
              style={
                message.includes('✅')
                  ? styles.successBox
                  : styles.errorBox
              }
            >
              <Text
                style={
                  message.includes('✅')
                    ? styles.successText
                    : styles.errorText
                }
              >
                {message}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (profileLoaded && username.trim() === '') {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authCard}>
          <Text style={styles.logo}>👤</Text>
          <Text style={styles.authTitle}>Tvoje meno</Text>
          <Text style={styles.authSubtitle}>
            Zadaj meno hráča. Toto pole je povinné.
          </Text>

          <TextInput
            style={styles.inputFull}
            placeholder="Napr. Michal"
            value={usernameInput}
            onChangeText={setUsernameInput}
          />

          <Pressable style={styles.primaryButton} onPress={saveProfile}>
            <Text style={styles.primaryButtonText}>Uložiť meno</Text>
          </Pressable>

          {message !== '' && (
            <View
              style={
                message.includes('✅')
                  ? styles.successBox
                  : styles.errorBox
              }
            >
              <Text
                style={
                  message.includes('✅')
                    ? styles.successText
                    : styles.errorText
                }
              >
                {message}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerSmall}>Tipovačka</Text>
        <Text style={styles.headerTitle}>Nemecká Bundesliga 2026/2027</Text>
        <Text style={styles.headerPlayer}>Hráč: {username}</Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={styles.smallButton}
          onPress={async () => {
            await loadAfterLogin(session.user.id);
            setMessage('✅ Obnovené');
          }}
        >
          <Text style={styles.smallButtonText}>Obnoviť</Text>
        </Pressable>

        <Pressable style={styles.smallOutlineButton} onPress={logout}>
          <Text style={styles.smallOutlineButtonText}>Odhlásiť sa</Text>
        </Pressable>
      </View>

      {message !== '' && (
        <View
          style={
            message.includes('✅')
              ? styles.successBox
              : styles.errorBox
          }
        >
          <Text
            style={
              message.includes('✅')
                ? styles.successText
                : styles.errorText
            }
          >
            {message}
          </Text>
        </View>
      )}

      <View style={styles.switchCard}>
        <Text style={styles.switchTitle}>Zobrazenie</Text>

        <View style={styles.switchRow}>
          <Pressable
            style={[
              styles.switchButton,
              mainView === 'UPCOMING' && styles.switchButtonActive,
            ]}
            onPress={() => setMainView('UPCOMING')}
          >
            <Text
              style={[
                styles.switchText,
                mainView === 'UPCOMING' && styles.switchTextActive,
              ]}
            >
              Najbližšie
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.switchButton,
              mainView === 'HISTORY' && styles.switchButtonActive,
            ]}
            onPress={() => setMainView('HISTORY')}
          >
            <Text
              style={[
                styles.switchText,
                mainView === 'HISTORY' && styles.switchTextActive,
              ]}
            >
              História
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.switchButton,
              mainView === 'TABLES' && styles.switchButtonActive,
            ]}
            onPress={() => setMainView('TABLES')}
          >
            <Text
              style={[
                styles.switchText,
                mainView === 'TABLES' && styles.switchTextActive,
              ]}
            >
              Tabuľky
            </Text>
          </Pressable>
          <Pressable
  style={[
    styles.switchButton,
    mainView === 'STATS' && styles.switchButtonActive,
  ]}
  onPress={() => setMainView('STATS')}
>
  <Text
    style={[
      styles.switchText,
      mainView === 'STATS' && styles.switchTextActive,
    ]}
  >
    Štatistiky
  </Text>
</Pressable>

          <Pressable
            style={[
              styles.switchButton,
              mainView === 'PROFILE' && styles.switchButtonActive,
            ]}
            onPress={() => setMainView('PROFILE')}
          >
            <Text
              style={[
                styles.switchText,
                mainView === 'PROFILE' && styles.switchTextActive,
              ]}
            >
              Profil
            </Text>
          </Pressable>

        </View>
      </View>

      {isAdmin && (
        <View style={styles.adminCard}>
          <Text style={styles.adminTitle}>👑 Admin panel</Text>

          <TextInput
            style={styles.inputFull}
            placeholder="Domáci tím"
            value={newHomeTeam}
            onChangeText={setNewHomeTeam}
          />

          <TextInput
            style={styles.inputFull}
            placeholder="Hostia"
            value={newAwayTeam}
            onChangeText={setNewAwayTeam}
          />

          <TextInput
            style={styles.inputFull}
            placeholder="Výkop – môže zostať prázdny"
            value={newKickoff}
            onChangeText={setNewKickoff}
          />

          <TextInput
            style={styles.inputFull}
            placeholder="Číslo kola (1-34)"
            value={newRoundNumber}
            onChangeText={setNewRoundNumber}
            keyboardType="numeric"
          />

          <Pressable style={styles.primaryButton} onPress={addMatch}>
            <Text style={styles.primaryButtonText}>Pridať zápas</Text>
          </Pressable>
        </View>
      )}
{/* ČASŤ 12/12 */}

      {mainView === 'UPCOMING' && (
        <>
          <Text style={styles.sectionTitle}>⚽ Kolá Bundesligy</Text>

          {upcomingRounds.length === 0 ? (
            <Text style={styles.notice}>Žiadne najbližšie zápasy.</Text>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.upcomingRoundScroller}
                contentContainerStyle={styles.upcomingRoundScrollerContent}
              >
                {upcomingRounds.map((round) => (
                  <Pressable
                    key={`upcoming-round-${round}`}
                    style={[
                      styles.roundButton,
                      selectedUpcomingRound === round && styles.roundButtonActive,
                    ]}
                    onPress={() => setSelectedUpcomingRound(round)}
                  >
                    <Text
                      style={[
                        styles.roundText,
                        selectedUpcomingRound === round && styles.roundTextActive,
                      ]}
                    >
                      {round === nextRound ? '➡️ ' : ''}{round}. kolo
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {selectedUpcomingRound !== null && (
                <>
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>
                      {selectedUpcomingRound === nextRound ? '➡️ ' : ''}
                      {selectedUpcomingRound}. kolo
                    </Text>
                  </View>

                  {(() => {
                    const summary = roundTipSummary.get(selectedUpcomingRound);
                    if (!summary) return null;

                    return (
                      <View style={styles.tipSummaryCard}>
                        <Text style={styles.tipSummaryTitle}>
                          Kontrola tipov kola
                        </Text>

                        {summary.total === 0 ? (
                          <Text style={styles.tipSummaryNeutral}>
                            ⏳ Zatiaľ nie je určený termín žiadneho zápasu.
                          </Text>
                        ) : summary.missing === 0 ? (
                          <Text style={styles.tipSummaryComplete}>
                            ✅ Všetkých {summary.total} zápasov máš natipovaných
                          </Text>
                        ) : (
                          <Text style={styles.tipSummaryMissing}>
                            ⚠️ Natipované {summary.saved} / {summary.total} · chýba {summary.missing}
                          </Text>
                        )}

                        {summary.matches.map((item) => {
                          const saved = savedTips[item.id];
                          const hasKickoff = Boolean(item.kickoff_at);
                          const hasSaved =
                            Boolean(saved) &&
                            saved.home !== '' &&
                            saved.away !== '';

                          return (
                            <View key={`summary-${item.id}`} style={styles.tipSummaryRow}>
                              <Text style={styles.tipSummaryMatch} numberOfLines={1}>
                                {item.home_team} – {item.away_team}
                              </Text>
                              <Text
                                style={
                                  !hasKickoff
                                    ? styles.tipSummaryNeutral
                                    : hasSaved
                                      ? styles.tipSummaryComplete
                                      : styles.tipSummaryMissing
                                }
                              >
                                {!hasKickoff
                                  ? '⏳ TERMÍN'
                                  : hasSaved
                                    ? `✅ ${saved.home}:${saved.away}`
                                    : '⚠️ CHÝBA'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })()}

                  {selectedUpcomingMatches.map(renderMatchCard)}
                </>
              )}
            </>
          )}
        </>
      )}

      {mainView === 'HISTORY' && (
        <>
          <Text style={styles.sectionTitle}>📚 História kôl</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              style={[
                styles.roundButton,
                selectedRound === 'ALL' && styles.roundButtonActive,
              ]}
              onPress={() => setSelectedRound('ALL')}
            >
              <Text
                style={[
                  styles.roundText,
                  selectedRound === 'ALL' && styles.roundTextActive,
                ]}
              >
                Všetko
              </Text>
            </Pressable>

            {playedRounds.map((round) => (
              <Pressable
                key={round}
                style={[
                  styles.roundButton,
                  selectedRound === round && styles.roundButtonActive,
                ]}
                onPress={() => setSelectedRound(round)}
              >
                <Text
                  style={[
                    styles.roundText,
                    selectedRound === round && styles.roundTextActive,
                  ]}
                >
                  {round}. kolo
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {historyMatches.length === 0 ? (
            <Text style={styles.notice}>Zatiaľ nie je história zápasov.</Text>
          ) : (
            historyMatches.map(renderMatchCard)
          )}
        </>
      )}

      {mainView === 'TABLES' && (
        <>
          <View style={styles.switchCard}>
            <Text style={styles.switchTitle}>Kolo</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                style={[
                  styles.roundButton,
                  selectedRound === 'ALL' && styles.roundButtonActive,
                ]}
                onPress={() => setSelectedRound('ALL')}
              >
                <Text
                  style={[
                    styles.roundText,
                    selectedRound === 'ALL' && styles.roundTextActive,
                  ]}
                >
                  Celkovo
                </Text>
              </Pressable>

              {roundOrder.map((round) => (
                <Pressable
                  key={round}
                  style={[
                    styles.roundButton,
                    selectedRound === round && styles.roundButtonActive,
                  ]}
                  onPress={() => setSelectedRound(round)}
                >
                  <Text
                    style={[
                      styles.roundText,
                      selectedRound === round && styles.roundTextActive,
                    ]}
                  >
                    {round}. kolo
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>
              🏆 {selectedRound === 'ALL' ? 'Celková tabuľka' : `${selectedRound}. kolo`}
            </Text>

            {activeStandings.length === 0 ? (
              <Text style={styles.notice}>
                Tabuľka sa zobrazí po zadaní výsledkov.
              </Text>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.standingsTable}>
                    <View style={styles.standingsHeaderRow}>
                      <Text style={[styles.standingsHeader, styles.colRank]}>#</Text>
                      <Text style={[styles.standingsHeader, styles.colPlayer]}>Hráč</Text>
                      <Text style={[styles.standingsHeader, styles.colStat]}>3 b.</Text>
                      <Text style={[styles.standingsHeader, styles.colStat]}>1 b.</Text>
                      <Text style={[styles.standingsHeader, styles.colTruth]}>TP</Text>
                      <Text style={[styles.standingsHeader, styles.colPoints]}>Body</Text>
                    </View>

                    {activeStandings.map((player, index) => (
                      <View
                        key={player.userId}
                        style={[
                          styles.standingsRow,
                          index === 0 && styles.firstPlaceRow,
                        ]}
                      >
                        <Text style={[styles.standingsCell, styles.colRank]}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                        </Text>
                        <Text style={[styles.standingsCell, styles.colPlayer]}>{player.name}</Text>
                        <Text style={[styles.standingsCell, styles.colStat]}>{player.exactTips}</Text>
                        <Text style={[styles.standingsCell, styles.colStat]}>{player.onePointTips}</Text>
                        <Text style={[styles.standingsCell, styles.colTruth]}>{player.truthTable}</Text>
                        <Text style={[styles.standingsCell, styles.colPoints, styles.points]}>{player.points}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.tableLegend}>
                  Tabuľka pravdy = počet 3-bodových + počet 1-bodových tipov.
                </Text>
              </>
            )}
          </View>
        </>
      )}

      {mainView === 'STATS' && (
        <>
          <Text style={styles.sectionTitle}>📊 Štatistiky hráčov</Text>

          {playerStats.length === 0 ? (
            <Text style={styles.notice}>Zatiaľ nie sú žiadne štatistiky.</Text>
          ) : (
            playerStats.map((player, index) => (
              <View key={player.userId} style={styles.tableCard}>
                <Text style={styles.tableTitle}>
                  {index + 1}. {player.name}
                </Text>

                <Text style={styles.notice}>Tipy spolu: {player.tips}</Text>
                <Text style={styles.notice}>Vyhodnotené tipy: {player.evaluatedTips}</Text>
                <Text style={styles.notice}>Presné výsledky (3 b.): {player.exactResults}</Text>
                <Text style={styles.notice}>1-bodové tipy: {player.onePointTips}</Text>
                <Text style={styles.notice}>Úspešnosť presných: {player.successRate}%</Text>
                <Text style={styles.notice}>🎯 Tabuľka pravdy: {player.truthTable}</Text>
                <Text style={styles.notice}>🏆 Vyhrané kolá: {player.wonRounds}</Text>
                <Text style={styles.notice}>
                  ⭐ Najlepšie kolo: {player.bestRound > 0 ? `${player.bestRound}. kolo (${player.bestRoundPoints} b.)` : '-'}
                </Text>
                <Text style={styles.notice}>Body spolu: {player.totalPoints}</Text>
              </View>
            ))
          )}
        </>
      )}
      {mainView === 'PROFILE' && (
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>👤 Profil</Text>

          <Text style={styles.notice}>
            Aktuálne meno:
          </Text>

          <Text style={styles.profileName}>
            {username}
          </Text>

          <TextInput
            style={styles.inputFull}
            placeholder="Nové meno"
            value={newUsername}
            onChangeText={setNewUsername}
          />

          <Pressable style={styles.primaryButton} onPress={updateUsername}>
            <Text style={styles.primaryButtonText}>Uložiť nové meno</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { padding: 18, paddingTop: 50, paddingBottom: 40 },
  authContainer: { flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', padding: 20 },
  authCard: { backgroundColor: 'white', borderRadius: 24, padding: 24 },
  logo: { fontSize: 50, textAlign: 'center' },
  authTitle: { fontSize: 34, fontWeight: '900', textAlign: 'center', marginTop: 10 },
  authSeason: { fontSize: 24, fontWeight: '900', textAlign: 'center', color: '#DC2626' },
  authSubtitle: { textAlign: 'center', marginTop: 10, marginBottom: 20, color: '#6B7280' },

  header: { backgroundColor: '#111827', borderRadius: 24, padding: 22, marginBottom: 20 },
  headerSmall: { color: '#D1D5DB', fontWeight: '700' },
  headerTitle: { color: 'white', fontSize: 30, fontWeight: '900', marginTop: 6 },
  headerPlayer: { color: '#FCA5A5', marginTop: 8, fontWeight: '700' },

  inputFull: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 14, padding: 15, marginBottom: 12, fontSize: 16 },

  primaryButton: { marginTop: 14, backgroundColor: '#DC2626', padding: 15, borderRadius: 14 },
  primaryButtonText: { color: 'white', textAlign: 'center', fontWeight: '900', fontSize: 16 },
  outlineButton: { padding: 15, borderRadius: 14, marginTop: 10, borderWidth: 1, borderColor: '#111827' },
  outlineButtonText: { textAlign: 'center', fontWeight: '800' },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  smallButton: { flex: 1, backgroundColor: '#111827', padding: 13, borderRadius: 14, marginTop: 10 },
  smallButtonText: { color: 'white', textAlign: 'center', fontWeight: '900' },
  smallOutlineButton: { flex: 1, backgroundColor: 'white', padding: 13, borderRadius: 14, borderWidth: 1, borderColor: '#D1D5DB' },
  smallOutlineButtonText: { textAlign: 'center', fontWeight: '900' },

  adminCard: { backgroundColor: '#FEF3C7', borderRadius: 22, padding: 18, marginBottom: 18 },
  adminTitle: { fontSize: 24, fontWeight: '900', marginBottom: 12 },
  adminSubtitle: { fontSize: 16, fontWeight: '900', textAlign: 'center', marginTop: 10, marginBottom: 10 },
  adminResultBox: { marginTop: 16, backgroundColor: '#FEF3C7', borderRadius: 16, padding: 12 },

  deleteButton: { marginTop: 10, backgroundColor: '#7F1D1D', padding: 13, borderRadius: 14 },
  deleteButtonText: { color: 'white', textAlign: 'center', fontWeight: '900' },

  switchCard: { backgroundColor: 'white', borderRadius: 22, padding: 16, marginBottom: 14 },
  switchTitle: { fontSize: 18, fontWeight: '900', marginBottom: 10 },
  switchRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  switchButton: { flexGrow: 1, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 14 },
  switchButtonActive: { backgroundColor: '#DC2626' },
  switchText: { textAlign: 'center', fontWeight: '900', color: '#111827' },
  switchTextActive: { color: 'white' },

  roundButton: { backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, marginRight: 8, marginBottom: 12 },
  roundButtonActive: { backgroundColor: '#111827' },
  roundText: { fontWeight: '900', color: '#111827' },
  roundTextActive: { color: 'white' },

  topCard: { backgroundColor: '#FEF3C7', borderRadius: 22, padding: 18, marginBottom: 16 },
  topTitle: { fontWeight: '900', fontSize: 18, textAlign: 'center' },
  topPlayer: { marginTop: 8, fontSize: 22, fontWeight: '900', textAlign: 'center', color: '#DC2626' },

  tableCard: { backgroundColor: 'white', borderRadius: 22, padding: 18, marginBottom: 18 },
  tableTitle: { fontSize: 22, fontWeight: '900', marginBottom: 10 },
  tableRow: { flexDirection: 'row', paddingVertical: 10 },
  firstPlaceRow: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 8 },
  rank: { width: 35, fontWeight: '900' },
  playerName: { flex: 1, fontWeight: '700' },
  points: { fontWeight: '900', color: '#DC2626' },
  profileName: { textAlign: 'center', fontSize: 24, fontWeight: '900', color: '#DC2626', marginBottom: 20 },

  sectionTitle: { fontSize: 24, fontWeight: '900', marginBottom: 12 },
  dateHeader: { marginTop: 10, marginBottom: 10 },
  dateHeaderText: { fontSize: 22, fontWeight: '900', color: '#111827' },

  matchCard: { backgroundColor: 'white', borderRadius: 22, padding: 18, marginBottom: 18 },
  matchStatus: { alignSelf: 'flex-start', backgroundColor: '#FEE2E2', color: '#991B1B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontWeight: '900', marginBottom: 8 },
  teamsRow: { flexDirection: 'row', alignItems: 'center' },
  teamSide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  teamLogo: { width: 46, height: 46, marginBottom: 6 },
  teamName: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '900' },
  vs: { paddingHorizontal: 10, fontWeight: '900', color: '#9CA3AF' },
  kickoff: { marginTop: 10, textAlign: 'center', color: '#6B7280', fontWeight: '800' },

  resultBox: { marginTop: 16, backgroundColor: '#F3F4F6', borderRadius: 16, padding: 12, alignItems: 'center' },
  resultScore: { fontSize: 30, fontWeight: '900' },
  subheading: { marginTop: 18, textAlign: 'center', fontWeight: '900', fontSize: 17 },
  tipRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  inputScore: { width: 66, height: 56, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 14, textAlign: 'center', fontSize: 24, fontWeight: '900', backgroundColor: '#F9FAFB' },
  colon: { fontSize: 30, marginHorizontal: 14, fontWeight: '900' },

  savedTip: { marginTop: 14, textAlign: 'center', fontSize: 18, fontWeight: '900', color: '#DC2626' },
  tipLine: { marginTop: 10, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center' },
  tipPlayer: { flex: 1, fontWeight: '900' },
  tipScore: { width: 70, textAlign: 'center', fontWeight: '900' },
  tipPoints: { width: 90, textAlign: 'right', fontWeight: '900', color: '#DC2626' },

  upcomingRoundScroller: { marginBottom: 10 },
  upcomingRoundScrollerContent: { paddingRight: 12 },

  tipSummaryCard: { backgroundColor: 'white', borderRadius: 18, padding: 15, marginBottom: 14 },
  tipSummaryTitle: { fontSize: 17, fontWeight: '900', marginBottom: 8, color: '#111827' },
  tipSummaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  tipSummaryMatch: { flex: 1, paddingRight: 8, fontSize: 13, fontWeight: '700', color: '#374151' },
  tipSummaryComplete: { color: '#166534', fontWeight: '900' },
  tipSummaryMissing: { color: '#991B1B', fontWeight: '900' },
  tipSummaryNeutral: { color: '#6B7280', fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
  unsavedBoxSmall: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B', padding: 10, borderRadius: 12, marginTop: 10 },
  unsavedText: { color: '#92400E', fontWeight: '900', textAlign: 'center' },

  successBox: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#22C55E', padding: 14, borderRadius: 14, marginBottom: 14 },
  successBoxSmall: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#22C55E', padding: 10, borderRadius: 12, marginTop: 10 },
  successText: { color: '#166534', fontWeight: '900', textAlign: 'center' },
  errorBox: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#DC2626', padding: 14, borderRadius: 14, marginBottom: 14 },
  errorText: { color: '#991B1B', fontWeight: '900', textAlign: 'center' },
  notice: { textAlign: 'center', color: '#6B7280', marginTop: 10 },
progressRow: {
  marginTop: 10,
},

statsBarBackground: {
  height: 12,
  backgroundColor: '#E5E7EB',
  borderRadius: 999,
  overflow: 'hidden',
  marginTop: 6,
},

statsBarFill: {
  height: 12,
  backgroundColor: '#DC2626',
  borderRadius: 999,
},

championGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 12,
},

championButton: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  backgroundColor: '#E5E7EB',
  borderRadius: 8,
},

championButtonActive: {
  backgroundColor: '#DC2626',
},

championButtonText: {
  color: '#111827',
  fontWeight: '600',
},

championButtonTextActive: {
  color: '#FFFFFF',
},

  standingsTable: { minWidth: 620 },
  standingsHeaderRow: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6 },
  standingsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  standingsHeader: { color: 'white', fontWeight: '900', textAlign: 'center' },
  standingsCell: { fontWeight: '700', textAlign: 'center' },
  colRank: { width: 45 },
  colPlayer: { width: 180, textAlign: 'left' },
  colStat: { width: 70 },
  colTruth: { width: 90 },
  colPoints: { width: 80 },
  tableLegend: { textAlign: 'center', color: '#6B7280', marginTop: 14, fontSize: 12 },
});