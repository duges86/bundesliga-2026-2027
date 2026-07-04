// ČASŤ 1/10

import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import * as Notifications from 'expo-notifications';

import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL = 'duges86@gmail.com';
const CHAMPION_TEAMS = [
  'Alžírsko',
  'Argentína',
  'Austrália',
  'Belgicko',
  'Bosna a Hercegovina',
  'Brazília',
  'Cabo Verde',
  'Curaçao',
  'Česko',
  'Egypt',
  'Ekvádor',
  'Francúzsko',
  'Ghana',
  'Haiti',
  'Holandsko',
  'Chorvátsko',
  'Irak',
  'Irán',
  'Japonsko',
  'Jordánsko',
  'Južná Afrika',
  'Južná Kórea',
  'Kanada',
  'Kolumbia',
  'Kongo DR',
  'Maroko',
  'Mexiko',
  'Nemecko',
  'Nový Zéland',
  'Nórsko',
  'Panama',
  'Paraguaj',
  'Pobrežie Slonoviny',
  'Portugalsko',
  'Rakúsko',
  'Saudská Arábia',
  'Senegal',
  'Škótsko',
  'Španielsko',
  'Švajčiarsko',
  'Švédsko',
  'Tunisko',
  'Turecko',
  'Uruguaj',
  'USA',
  'Uzbekistan',
  'Anglicko',
  'Katar',
];

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

function calculateMOPoints(
  tipHome: number,
  tipAway: number,
  realHome: number,
  realAway: number
) {
  if (tipHome === realHome && tipAway === realAway) return 10;

  const tipResult = getResultType(tipHome, tipAway);
  const realResult = getResultType(realHome, realAway);

  const sameResult = tipResult === realResult;

  const tipDifference = Math.abs(tipHome - tipAway);
  const realDifference = Math.abs(realHome - realAway);
  const sameGoalDifference = tipDifference === realDifference;

  const tipTotalGoals = tipHome + tipAway;
  const realTotalGoals = realHome + realAway;
  const sameTotalGoals = tipTotalGoals === realTotalGoals;

  if (realResult === 'DRAW' && tipResult === 'DRAW') return 6;

  if (sameResult && (sameGoalDifference || sameTotalGoals)) return 6;

  if (sameResult) return 4;

  if (sameGoalDifference || sameTotalGoals) return 2;

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

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('sk-SK', {
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
  const [allTips, setAllTips] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [championTip, setChampionTip] = useState('');
const [championTips, setChampionTips] = useState<any[]>([]);
const [championMessage, setChampionMessage] = useState('');
const [championshipWinner, setChampionshipWinner] =
  useState('');

  const [isResetMode, setIsResetMode] = useState(false);
const [newPassword, setNewPassword] = useState('');

  const [message, setMessage] = useState('');
  const [matchMessages, setMatchMessages] = useState<any>({});

  const [mainView, setMainView] = useState<
  'UPCOMING' |
  'HISTORY' |
  'TABLES' |
  'STATS' |
  'CHAMPION' |
  'PROFILE'
>('UPCOMING'); 

  const [selectedTable, setSelectedTable] = useState<
    'STANDARD' | 'MO'
  >('STANDARD');

  const [selectedDay, setSelectedDay] =
    useState<string | 'ALL'>('ALL');

  const [newHomeTeam, setNewHomeTeam] = useState('');
  const [newAwayTeam, setNewAwayTeam] = useState('');
  const [newKickoff, setNewKickoff] = useState('');

  const [resultInputs, setResultInputs] = useState<any>({});
  const [editInputs, setEditInputs] = useState<any>({});
// ČASŤ 3/10

  useEffect(() => {
    start();

   const { data } = supabase.auth.onAuthStateChange(
  (event, session) => {
    console.log('AUTH EVENT:', event);
console.log('AUTH SESSION:', !!session);
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
    await loadChampionTips(userId);
    await loadChampionshipWinner();
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

  const requestNotificationPermission = async () => {
    const permission =
      await Notifications.requestPermissionsAsync();

    return permission.granted;
  };
  const openNotificationSettings = async () => {
  const permission =
    await Notifications.requestPermissionsAsync();

  if (permission.granted) {
    setMessage('✅ Notifikácie sú povolené');
    return;
  }

  setMessage(
    'Notifikácie nie sú povolené. Otvor nastavenia aplikácie a povoľ ich.'
  );

  await Linking.openSettings();
};

  const scheduleMatchNotification = async (
    homeTeam: string,
    awayTeam: string,
    kickoffAt: string
  ) => {
    const granted =
      await requestNotificationPermission();

    if (!granted) {
      return;
    }

    const kickoffDate =
      new Date(kickoffAt);

    const notificationDate =
      new Date(kickoffDate);

    notificationDate.setDate(
      notificationDate.getDate() - 1
    );

    notificationDate.setHours(17);
    notificationDate.setMinutes(0);
    notificationDate.setSeconds(0);
    notificationDate.setMilliseconds(0);

    if (notificationDate <= new Date()) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚽ Zajtra sa hrá zápas',
        body: `${homeTeam} vs ${awayTeam}. Nezabudni natipovať.`,
      },
      trigger: {
        date: notificationDate,
        channelId: 'default',
      },
    });
  };

  const sendInstantNotification = async (
    title: string,
    body: string
  ) => {
    const granted =
      await requestNotificationPermission();

    if (!granted) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: {
        seconds: 3,
        channelId: 'default',
      },
    });
  };
// ČASŤ 6/10

  const loadMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
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
      };
    });

    setEditInputs(editObject);
  };

  const loadMyTips = async (userId: string) => {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
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
  };

 const loadAllTips = async () => {
  let allTipsData: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
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
    .select('*');

  if (error) {
    setMessage(error.message);
    return;
  }

  setProfiles(data || []);
};
const loadChampionTips = async (userId?: string) => {
  const { data, error } = await supabase
    .from('champion_tips')
    .select('*');

  if (error) {
    setMessage(error.message);
    return;
  }

  setChampionTips(data || []);

  const currentUserId = userId || session?.user?.id;

  const myChampionTip = data?.find(
    (tip) => tip.user_id === currentUserId
  );

  if (myChampionTip) {
    setChampionTip(myChampionTip.team);
  } else {
    setChampionTip('');
  }
};
const loadChampionshipWinner = async () => {
  const { data, error } = await supabase
    .from('championship_settings')
    .select('*')
    .eq('id', 'main')
    .maybeSingle();

  if (error) {
    setMessage(error.message);
    return;
  }

  if (data?.winner) {
    setChampionshipWinner(data.winner);
  }
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
    field: 'home_team' | 'away_team' | 'kickoff_at',
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
    if (!session) return;

    const tip = myTips[matchId];

    if (!tip || tip.home === '' || tip.away === '') {
      setMessage('Najprv vyplň oba výsledky.');
      return;
    }

    const match = matches.find((item) => item.id === matchId);

    if (!match) {
      setMessage('Zápas sa nenašiel.');
      return;
    }

    if (new Date() >= new Date(match.kickoff_at)) {
      setMessage('Tento zápas je už uzavretý.');
      return;
    }

    const existingTip = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', matchId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (existingTip.data) {
      const { error } = await supabase
        .from('predictions')
        .update({
          home_tip: Number(tip.home),
          away_tip: Number(tip.away),
        })
        .eq('match_id', matchId)
        .eq('user_id', session.user.id);

      if (error) {
        setMessage(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('predictions')
        .insert({
          match_id: matchId,
          user_id: session.user.id,
          home_tip: Number(tip.home),
          away_tip: Number(tip.away),
        });

      if (error) {
        setMessage(error.message);
        return;
      }
    }

    setMatchMessages((prev: any) => ({
      ...prev,
      [matchId]: '✅ Tip uložený',
    }));

    await loadMyTips(session.user.id);
    await loadAllTips();
  };
  const saveChampionTip = async () => {
  setMessage('');
  setChampionMessage('');

  if (!session) return;

  if (championTip.trim() === '') {
    setMessage('Vyber víťaza šampionátu.');
    return;
  }

  const championTipDeadline =
    new Date('2026-06-11T22:59:59');

  if (new Date() > championTipDeadline) {
    setMessage(
      'Tip na víťaza šampionátu už nie je možné meniť.'
    );
    return;
  }

  const existingTip = await supabase
    .from('champion_tips')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (existingTip.data) {
    const { error } = await supabase
      .from('champion_tips')
      .update({
        team: championTip.trim(),
      })
      .eq('user_id', session.user.id);

    if (error) {
      setMessage(error.message);
      return;
    }
  } else {
    const { error } = await supabase
      .from('champion_tips')
      .insert({
        user_id: session.user.id,
        team: championTip.trim(),
      });

    if (error) {
      setMessage(error.message);
      return;
    }
  }

  setChampionMessage('✅ Tip na víťaza šampionátu uložený');

  await loadChampionTips(session.user.id);
};
const saveChampionshipWinner = async () => {
  if (!isAdmin) return;

  if (championshipWinner.trim() === '') {
    setMessage('Vyber skutočného víťaza šampionátu.');
    return;
  }

  const { error } = await supabase
    .from('championship_settings')
    .update({
      winner: championshipWinner.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'main');

  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage('✅ Víťaz šampionátu uložený');

  await loadChampionshipWinner();
};
// ČASŤ 8/10

  const getDayTopPlayersText = (
    changedMatchId: string,
    newHomeScore: number,
    newAwayScore: number
  ) => {
    const changedMatch =
      matches.find((item) => item.id === changedMatchId);

    if (!changedMatch) return null;

    const dayKey = getDateKey(changedMatch.kickoff_at);

    const dayMatches = matches
      .map((match) => {
        if (match.id === changedMatchId) {
          return {
            ...match,
            home_score: newHomeScore,
            away_score: newAwayScore,
          };
        }

        return match;
      })
      .filter(
        (match) =>
          getDateKey(match.kickoff_at) === dayKey
      );

    const allDayMatchesHaveResults =
      dayMatches.length > 0 &&
      dayMatches.every(
        (match) =>
          match.home_score !== null &&
          match.away_score !== null
      );

    if (!allDayMatchesHaveResults) {
      return null;
    }

    const standings = allTips.reduce(
      (acc: any[], tip: any) => {
        const match = dayMatches.find(
          (item) => item.id === tip.match_id
        );

        if (!match) return acc;

        const points = calculateMOPoints(
          Number(tip.home_tip),
          Number(tip.away_tip),
          Number(match.home_score),
          Number(match.away_score)
        );

        const profile = profiles.find(
  (p) => p.id === tip.user_id
);
const name =
  profile?.username ||
  (tip.user_id === session?.user?.id
    ? username
    : 'Hráč');

        const existingPlayer = acc.find(
          (player) => player.userId === tip.user_id
        );

        if (existingPlayer) {
          existingPlayer.points += points;
        } else {
          acc.push({
            userId: tip.user_id,
            name,
            points,
          });
        }

        return acc;
      },
      []
    );

    standings.sort((a, b) => b.points - a.points);

    if (standings.length === 0) return null;

    const maxPoints = standings[0].points;

    const winners = standings.filter(
      (player) => player.points === maxPoints
    );

    const names = winners
      .map((player) => player.name)
      .join(', ');

    return {
      day: formatDate(dayKey),
      text: `${names} získal/i ${maxPoints} bodov.`,
    };
  };

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

    const topInfo = getDayTopPlayersText(
  matchId,
  homeScore,
  awayScore
);

    if (topInfo) {
      await sendInstantNotification(
        '🏆 Deň bol vyhodnotený',
        `${topInfo.day} je kompletne vyhodnotený. Pozri si tabuľku.`
      );

      await sendInstantNotification(
        '🥇 TOP hráč dňa',
        topInfo.text
      );
    }

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
      edit.away_team.trim() === '' ||
      edit.kickoff_at.trim() === ''
    ) {
      setMessage('Vyplň tímy aj čas výkopu.');
      return;
    }

    const { error } = await supabase
      .from('matches')
      .update({
        home_team: edit.home_team.trim(),
        away_team: edit.away_team.trim(),
        kickoff_at: edit.kickoff_at.trim(),
      })
      .eq('id', matchId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await scheduleMatchNotification(
      edit.home_team.trim(),
      edit.away_team.trim(),
      edit.kickoff_at.trim()
    );

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
    if (!newHomeTeam || !newAwayTeam || !newKickoff) {
      setMessage('Vyplň tímy a čas výkopu.');
      return;
    }

    const { error } = await supabase
      .from('matches')
      .insert({
        home_team: newHomeTeam,
        away_team: newAwayTeam,
        kickoff_at: newKickoff,
        round_number: 1,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    await scheduleMatchNotification(
      newHomeTeam,
      newAwayTeam,
      newKickoff
    );

    setNewHomeTeam('');
    setNewAwayTeam('');
    setNewKickoff('');

    setMessage('✅ Zápas pridaný + notifikácia deň pred zápasom nastavená');

    await loadMatches();
  };

  const isAdmin =
    session?.user?.email === ADMIN_EMAIL;
// ČASŤ 10/10

  const upcomingMatches = useMemo(() => {
    return matches.filter((match) => {
      const hasResult =
        match.home_score !== null &&
        match.away_score !== null;

      return !hasResult;
    });
  }, [matches]);

  const playedMatches = useMemo(() => {
    return matches.filter((match) => {
      const hasResult =
        match.home_score !== null &&
        match.away_score !== null;

      return hasResult;
    });
  }, [matches]);

  const upcomingDays = useMemo(() => {
    return upcomingMatches
      .map((match) => getDateKey(match.kickoff_at))
      .filter((day, index, arr) => arr.indexOf(day) === index)
      .sort();
  }, [upcomingMatches]);

  const playingDays = useMemo(() => {
    return playedMatches
      .map((match) => getDateKey(match.kickoff_at))
      .filter((day, index, arr) => arr.indexOf(day) === index)
      .sort()
.reverse();
  }, [playedMatches]);
  const championTeams = CHAMPION_TEAMS;

  const tableMatches = useMemo(() => {
    if (selectedDay === 'ALL') return playedMatches;

    return playedMatches.filter(
      (match) => getDateKey(match.kickoff_at) === selectedDay
    );
  }, [playedMatches, selectedDay]);

  const historyMatches = useMemo(() => {
    if (selectedDay === 'ALL') return playedMatches;

    return playedMatches.filter(
      (match) => getDateKey(match.kickoff_at) === selectedDay
    );
  }, [playedMatches, selectedDay]);

  const getPointsForSystem = (
    tip: any,
    match: any,
    system: 'STANDARD' | 'MO'
  ) => {
    if (
      match.home_score === null ||
      match.away_score === null
    ) {
      return null;
    }

    if (system === 'STANDARD') {
      return calculateStandardPoints(
        Number(tip.home_tip),
        Number(tip.away_tip),
        Number(match.home_score),
        Number(match.away_score)
      );
    }

    return calculateMOPoints(
      Number(tip.home_tip),
      Number(tip.away_tip),
      Number(match.home_score),
      Number(match.away_score)
    );
  };

  const buildStandings = (system: 'STANDARD' | 'MO') => {
  const list = profiles
    .map((profile) => {
      const playerTips = allTips.filter(
        (tip) => tip.user_id === profile.id
      );

      let points = 0;

      playerTips.forEach((tip) => {
        const match = tableMatches.find(
          (item) => item.id === tip.match_id
        );

        if (
          !match ||
          match.home_score === null ||
          match.away_score === null
        ) {
          return;
        }

        points += getPointsForSystem(tip, match, system) || 0;
      });

      const championBonus =
        selectedDay === 'ALL' &&
        championshipWinner.trim() !== '' &&
        championTips.some(
          (tip) =>
            tip.user_id === profile.id &&
            tip.team.trim() === championshipWinner.trim()
        )
          ? 10
          : 0;

      points += championBonus;

      return {
        userId: profile.id,
        name: profile.username || 'Hráč',
        points,
      };
    })
    .filter((player) => player.points > 0);

  return list.sort((a, b) => b.points - a.points);
};

  const standardStandings = buildStandings('STANDARD');
  const moStandings = buildStandings('MO');

  const activeStandings =
    selectedTable === 'STANDARD'
      ? standardStandings
      : moStandings;

  const topDayPlayer =
    selectedDay === 'ALL' || moStandings.length === 0
      ? null
      : moStandings[0];

  const playerStats = profiles
  .map((profile) => {
    const playerTips = allTips.filter(
      (tip) => tip.user_id === profile.id
    );

    let exactResults = 0;
    let standardPoints = 0;
    let moPoints = 0;
    let evaluatedTips = 0;
let correctResultType = 0;
let bestDay = 0;
let wonDays = 0;
const dailyProgress: any[] = [];

    playerTips.forEach((tip) => {
      const match = playedMatches.find(
        (item) => item.id === tip.match_id
      );

      if (!match) return;

      evaluatedTips += 1;

      if (
        Number(tip.home_tip) === Number(match.home_score) &&
        Number(tip.away_tip) === Number(match.away_score)
      ) {
        exactResults += 1;
      }
      if (
  getResultType(Number(tip.home_tip), Number(tip.away_tip)) ===
  getResultType(Number(match.home_score), Number(match.away_score))
) {
  correctResultType += 1;
}

      standardPoints += calculateStandardPoints(
        Number(tip.home_tip),
        Number(tip.away_tip),
        Number(match.home_score),
        Number(match.away_score)
      );

      moPoints += calculateMOPoints(
        Number(tip.home_tip),
        Number(tip.away_tip),
        Number(match.home_score),
        Number(match.away_score)
      );
    });
    const playedDays = playedMatches
  .map((match) => getDateKey(match.kickoff_at))
  .filter((day, index, arr) => arr.indexOf(day) === index);

playedDays.forEach((day) => {
  const matchesForDay = playedMatches.filter(
    (match) => getDateKey(match.kickoff_at) === day
  );

  let dayPoints = 0;

  matchesForDay.forEach((match) => {
    const tip = playerTips.find(
      (item) => item.match_id === match.id
    );

    if (!tip) return;

    dayPoints += calculateMOPoints(
      Number(tip.home_tip),
      Number(tip.away_tip),
      Number(match.home_score),
      Number(match.away_score)
    );
  });
  const dayResults = profiles.map((otherProfile) => {
    const otherTips = allTips.filter(
      (tip) => tip.user_id === otherProfile.id
    );

    let otherDayPoints = 0;

    matchesForDay.forEach((match) => {
      const tip = otherTips.find(
        (item) => item.match_id === match.id
      );

      if (!tip) return;

      otherDayPoints += calculateMOPoints(
        Number(tip.home_tip),
        Number(tip.away_tip),
        Number(match.home_score),
        Number(match.away_score)
      );
    });

    return {
      userId: otherProfile.id,
      points: otherDayPoints,
    };
  });

  const maxDayPoints = Math.max(
    ...dayResults.map((item) => item.points)
  );

  if (
    dayPoints === maxDayPoints &&
    maxDayPoints > 0
  ) {
    wonDays += 1;
  }
  dailyProgress.push({
  day,
  points: dayPoints,
});
  if (dayPoints > bestDay) {
    bestDay = dayPoints;
  }
});
const averagePoints =
  evaluatedTips === 0
    ? 0
    : Math.round((moPoints / evaluatedTips) * 10) / 10;
const championBonus =
  championshipWinner &&
  championTips.find(
    (tip) =>
      tip.user_id === profile.id &&
      tip.team === championshipWinner
  )
    ? 10
    : 0;

standardPoints += championBonus;
moPoints += championBonus;
    const successRate =
      evaluatedTips === 0
        ? 0
        : Math.round((exactResults / evaluatedTips) * 100);
    const truthTableRate =
  evaluatedTips === 0
    ? 0
    : Math.round((correctResultType / evaluatedTips) * 100);

    return {
      userId: profile.id,
      name: profile.username || 'Hráč',
      tips: playerTips.length,
      evaluatedTips,
      exactResults,
      successRate,
      correctResultType,
truthTableRate,
      standardPoints,
      moPoints,
averagePoints,
bestDay,
wonDays,
dailyProgress,
    };
  })
  .sort((a, b) => b.moPoints - a.moPoints);

  const topPlayersHistory = playingDays
  .map((day) => {
    const matchesForDay = playedMatches.filter(
      (match) => getDateKey(match.kickoff_at) === day
    );

    const dayStandings = profiles
      .map((profile) => {
        const playerTips = allTips.filter(
          (tip) => tip.user_id === profile.id
        );

        let points = 0;

        matchesForDay.forEach((match) => {
          const tip = playerTips.find(
            (item) => item.match_id === match.id
          );

          if (!tip) return;

          points += calculateMOPoints(
            Number(tip.home_tip),
            Number(tip.away_tip),
            Number(match.home_score),
            Number(match.away_score)
          );
        });

        return {
          userId: profile.id,
          name: profile.username || 'Hráč',
          points,
        };
      })
      .filter((player) => player.points > 0)
      .sort((a, b) => b.points - a.points);

    if (dayStandings.length === 0) {
      return null;
    }

    const maxPoints = dayStandings[0].points;

    const winners = dayStandings.filter(
      (player) => player.points === maxPoints
    );

    return {
      day,
      names: winners.map((player) => player.name).join(', '),
      points: maxPoints,
    };
  })
  .filter(Boolean);

  const renderMatchCard = (match: any) => {
    const isLocked =
      new Date() >= new Date(match.kickoff_at);

    const tip = myTips[match.id];

    const hasResult =
      match.home_score !== null &&
      match.away_score !== null;

    const tipsForThisMatch = allTips.filter(
      (item) => item.match_id === match.id
    );

    return (
      <View key={match.id} style={styles.matchCard}>
        <Text style={styles.matchStatus}>
          {hasResult
            ? 'ODOHRANÉ'
            : isLocked
              ? 'UZAVRETÉ'
              : 'OTVORENÉ'}
        </Text>

        <View style={styles.teamsRow}>
          <Text style={styles.teamName}>{match.home_team}</Text>
          <Text style={styles.vs}>vs</Text>
          <Text style={styles.teamName}>{match.away_team}</Text>
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
              placeholder="Výkop"
              value={editInputs[match.id]?.kickoff_at || ''}
              onChangeText={(text) =>
                updateEditInput(match.id, 'kickoff_at', text)
              }
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

        {!hasResult && !isLocked && (
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
              style={styles.primaryButton}
              onPress={() => saveTip(match.id)}
            >
              <Text style={styles.primaryButtonText}>Uložiť tip</Text>
            </Pressable>

            {matchMessages[match.id] && (
              <View style={styles.successBoxSmall}>
                <Text style={styles.successText}>
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
                const standard = getPointsForSystem(item, match, 'STANDARD');
                const mo = getPointsForSystem(item, match, 'MO');

                return (
                  <View key={item.id} style={styles.tipLine}>
                    <Text style={styles.tipPlayer}>
                      {
  profiles.find((p) => p.id === item.user_id)
    ?.username ||
  (item.user_id === session.user.id
    ? username || 'Ja'
    : 'Hráč')
}
                    </Text>

                    <Text style={styles.tipScore}>
                      {item.home_tip} : {item.away_tip}
                    </Text>

                    <Text style={styles.tipPoints}>
                      S:{standard ?? '-'} / M:{mo ?? '-'}
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
          <Text style={styles.authTitle}>MS vo futbale</Text>
          <Text style={styles.authSeason}>2026</Text>
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
        <Text style={styles.headerSmall}>Majstrovstvá sveta</Text>
        <Text style={styles.headerTitle}>FIFA World Cup 2026</Text>
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
          <Pressable
  style={[
    styles.switchButton,
    mainView === 'CHAMPION' && styles.switchButtonActive,
  ]}
  onPress={() => setMainView('CHAMPION')}
>
  <Text
    style={[
      styles.switchText,
      mainView === 'CHAMPION' && styles.switchTextActive,
    ]}
  >
    Šampión
  </Text>
</Pressable>
        </View>
      </View>

      {isAdmin && (
        <View style={styles.adminCard}>
          <Text style={styles.adminTitle}>👑 Admin panel</Text>

          <TextInput
            style={styles.inputFull}
            placeholder="Domáci tím, napr. 🇸🇰 Slovensko"
            value={newHomeTeam}
            onChangeText={setNewHomeTeam}
          />

          <TextInput
            style={styles.inputFull}
            placeholder="Hostia, napr. 🇧🇷 Brazília"
            value={newAwayTeam}
            onChangeText={setNewAwayTeam}
          />

          <TextInput
            style={styles.inputFull}
            placeholder="Výkop: 2026-06-11 21:00:00"
            value={newKickoff}
            onChangeText={setNewKickoff}
          />

          <Pressable style={styles.primaryButton} onPress={addMatch}>
            <Text style={styles.primaryButtonText}>Pridať zápas</Text>
          </Pressable>
        </View>
      )}
{/* ČASŤ 12/12 */}

{mainView === 'CHAMPION' && (
  <>
    <View style={styles.tableCard}>
      <Text style={styles.tableTitle}>
        🏆 Tip na víťaza šampionátu
      </Text>

      <Text style={styles.notice}>
        Tip môžeš meniť do 11.6.2026 22:59:59.
      </Text>

      <Text style={styles.notice}>
        Vybraný tím: {championTip || 'zatiaľ nevybraný'}
      </Text>

      <View style={styles.championGrid}>
        {championTeams.map((team) => (
          <Pressable
            key={team}
            style={[
              styles.championButton,
              championTip === team && styles.championButtonActive,
            ]}
            onPress={() => setChampionTip(team)}
          >
            <Text
              style={[
                styles.championButtonText,
                championTip === team && styles.championButtonTextActive,
              ]}
            >
              {team}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.primaryButton} onPress={saveChampionTip}>
        <Text style={styles.primaryButtonText}>
          Uložiť tip na víťaza
        </Text>
      </Pressable>
      {championMessage !== '' && (
  <View style={styles.successBoxSmall}>
    <Text style={styles.successText}>
      {championMessage}
    </Text>
  </View>
)}
    </View>

    {isAdmin && (
      <View style={styles.adminCard}>
        <Text style={styles.adminTitle}>
          🏆 Skutočný víťaz šampionátu
        </Text>

        <Text style={styles.notice}>
          Vybraný víťaz: {championshipWinner || 'zatiaľ nevybraný'}
        </Text>

        <View style={styles.championGrid}>
          {championTeams.map((team) => (
            <Pressable
              key={team}
              style={[
                styles.championButton,
                championshipWinner === team && styles.championButtonActive,
              ]}
              onPress={() => setChampionshipWinner(team)}
            >
              <Text
                style={[
                  styles.championButtonText,
                  championshipWinner === team && styles.championButtonTextActive,
                ]}
              >
                {team}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.primaryButton} onPress={saveChampionshipWinner}>
          <Text style={styles.primaryButtonText}>
            Uložiť víťaza šampionátu
          </Text>
        </Pressable>
      </View>
    )}
  </>
)}
      {mainView === 'UPCOMING' && (
        <>
          <Text style={styles.sectionTitle}>⚽ Najbližšie zápasy</Text>

          {upcomingDays.length === 0 ? (
            <Text style={styles.notice}>Žiadne najbližšie zápasy.</Text>
          ) : (
            upcomingDays.map((day) => (
              <View key={day}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>
                    📅 {formatDate(day)}
                  </Text>
                </View>

                {upcomingMatches
                  .filter((match) => getDateKey(match.kickoff_at) === day)
                  .map(renderMatchCard)}
              </View>
            ))
          )}
        </>
      )}

      {mainView === 'HISTORY' && (
        <>
          <Text style={styles.sectionTitle}>📚 História hracích dní</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              style={[
                styles.roundButton,
                selectedDay === 'ALL' && styles.roundButtonActive,
              ]}
              onPress={() => setSelectedDay('ALL')}
            >
              <Text
                style={[
                  styles.roundText,
                  selectedDay === 'ALL' && styles.roundTextActive,
                ]}
              >
                Všetko
              </Text>
            </Pressable>

            {playingDays.map((day) => (
              <Pressable
                key={day}
                style={[
                  styles.roundButton,
                  selectedDay === day && styles.roundButtonActive,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.roundText,
                    selectedDay === day && styles.roundTextActive,
                  ]}
                >
                  {formatDate(day)}
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
            <Text style={styles.switchTitle}>Vyhodnocovanie</Text>

            <View style={styles.switchRow}>
              <Pressable
                style={[
                  styles.switchButton,
                  selectedTable === 'STANDARD' && styles.switchButtonActive,
                ]}
                onPress={() => setSelectedTable('STANDARD')}
              >
                <Text
                  style={[
                    styles.switchText,
                    selectedTable === 'STANDARD' && styles.switchTextActive,
                  ]}
                >
                  STANDARD
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.switchButton,
                  selectedTable === 'MO' && styles.switchButtonActive,
                ]}
                onPress={() => setSelectedTable('MO')}
              >
                <Text
                  style={[
                    styles.switchText,
                    selectedTable === 'MO' && styles.switchTextActive,
                  ]}
                >
                  M.O.
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.switchCard}>
            <Text style={styles.switchTitle}>Hrací deň</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                style={[
                  styles.roundButton,
                  selectedDay === 'ALL' && styles.roundButtonActive,
                ]}
                onPress={() => setSelectedDay('ALL')}
              >
                <Text
                  style={[
                    styles.roundText,
                    selectedDay === 'ALL' && styles.roundTextActive,
                  ]}
                >
                  Celkovo
                </Text>
              </Pressable>

              {playingDays.map((day) => (
                <Pressable
                  key={day}
                  style={[
                    styles.roundButton,
                    selectedDay === day && styles.roundButtonActive,
                  ]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text
                    style={[
                      styles.roundText,
                      selectedDay === day && styles.roundTextActive,
                    ]}
                  >
                    {formatDate(day)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {topDayPlayer && (
            <View style={styles.topCard}>
              <Text style={styles.topTitle}>🔥 TOP hráč dňa podľa M.O.</Text>
              <Text style={styles.topPlayer}>
                {topDayPlayer.name} — {topDayPlayer.points} b.
              </Text>
            </View>
          )}

          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>
              🏆 Tabuľka {selectedTable === 'STANDARD' ? 'STANDARD' : 'M.O.'}
            </Text>

            {activeStandings.length === 0 ? (
              <Text style={styles.notice}>
                Tabuľka sa zobrazí po zadaní výsledkov.
              </Text>
            ) : (
              activeStandings.map((player, index) => (
                <View
                  key={player.userId}
                  style={[
                    styles.tableRow,
                    index === 0 && styles.firstPlaceRow,
                  ]}
                >
                  <Text style={styles.rank}>
  {index === 0
    ? '🥇'
    : index === 1
      ? '🥈'
      : index === 2
        ? '🥉'
        : `${index + 1}.`}
</Text>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.points}>{player.points} b.</Text>
                </View>
              ))
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
          <Text style={styles.notice}>Presné výsledky: {player.exactResults}</Text>
          <Text style={styles.notice}>Úspešnosť presných: {player.successRate}%</Text>
          <Text style={styles.notice}>
  🎯 Tabuľka pravdy: {player.correctResultType}
</Text>
          <Text style={styles.notice}>STANDARD body: {player.standardPoints}</Text>
          <Text style={styles.notice}>M.O. body: {player.moPoints}</Text>
          <Text style={styles.notice}>
  🏆 Vyhrané dni: {player.wonDays}
</Text>

<Text style={styles.notice}>
  ⭐ Najlepší deň: {player.bestDay} b.
</Text>

<Text style={styles.notice}>
  📈 Priemer M.O. bodov: {player.averagePoints}
</Text><Text style={styles.sectionTitle}>
  📈 Vývoj bodov po dňoch
</Text>

{player.dailyProgress.map((day: any) => (
  <View key={day.day} style={styles.progressRow}>
    <Text style={styles.notice}>
      {formatDate(day.day)} — {day.points} b.
    </Text>

    <View style={styles.statsBarBackground}>
      <View
        style={[
          styles.statsBarFill,
          {
            width: `${
              player.bestDay === 0
                ? 0
                : Math.max(
                    8,
                    Math.round((day.points / player.bestDay) * 100)
                  )
            }%`,
          },
        ]}
      />
    </View>
  </View>
))}
        </View>
      ))
    )}
  <View style={styles.tableCard}>
  <Text style={styles.tableTitle}>
    🏆 História TOP hráča dňa
  </Text>

  {topPlayersHistory.map((item: any, index) => (
    <Text
      key={`${item.day}-${index}`}
      style={styles.notice}
    >
      {formatDate(item.day)} — {item.names} ({item.points} b.)
    </Text>
  ))}
</View>
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
          <Text style={styles.sectionTitle}>
  🔔 Notifikácie
</Text>

<Text style={styles.notice}>
  Notifikácie sa zapínajú v nastaveniach telefónu.
</Text>
<Text style={styles.notice}>
  1. Otvor Nastavenia telefónu
</Text>

<Text style={styles.notice}>
  2. Aplikácie
</Text>

<Text style={styles.notice}>
  3. Bundesliga 2026
</Text>

<Text style={styles.notice}>
  4. Notifikácie
</Text>

<Text style={styles.notice}>
  5. Povoliť notifikácie
</Text>
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
});