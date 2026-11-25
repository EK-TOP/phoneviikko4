import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Button, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type Task = {
  id: number;
  text: string;
  done: boolean;
};

// Avain, jolla tehtävät tallennetaan.
const STORAGE_KEY = 'tasks';

// Syöttökenttä ja painike uuden tehtävän lisäämiseen.
function TaskInput({ text, onChangeText, onSave }: {
  text: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        placeholder="Kirjoita tehtävä"
        value={text}
        onChangeText={onChangeText}
        onSubmitEditing={onSave}
      />
      <Button title="Tallenna" onPress={onSave} disabled={!text.trim()} />
    </View>
  );
}

// Näyttää yhden tehtävän, painaminen vaihtaa sen tilan.
function TaskRow({ task, onPress }: {
  task: Task;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.task, task.done && styles.done]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.done }}
    >
      <Text style={styles.taskText}>{task.text}</Text>
    </Pressable>
  );
}

export default function App() {
  // Sovelluksen tehtävät
  const [tasks, setTasks] = useState<Task[]>([]);
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const saveQueue = useRef(Promise.resolve());

  // tarkastaa tallennetut tehtävät sovelluksen käynnistyessä.
  useEffect(() => {
    let active = true;

    async function loadTasks() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        const savedTasks: unknown = saved === null ? [] : JSON.parse(saved);
        if (!Array.isArray(savedTasks) || !savedTasks.every(
          (task) => task && typeof task.id === 'number' &&
            typeof task.text === 'string' && typeof task.done === 'boolean'
        )) {
          throw new Error('Invalid task data');
        }
        if (active) {
          setTasks(savedTasks);
          setLoaded(true);
        }
      } catch (error) {
        console.error('Tehtävien lataaminen epäonnistui:', error);
      }
    }

    void loadTasks();
    // estää tilan päivittämisen, jos komponentti on jo poistunut.
    return () => { active = false; };
  }, []);

  // tallentaa tehtävät latauksen jälkeen aina, kun tehtävälista muuttuu.
  useEffect(() => {
    if (!loaded) return;
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      } catch (error) {
        console.error('Tehtävien tallentaminen epäonnistui:', error);
      }
    });
  }, [tasks, loaded]);

  // lissää  tehtävän uudella tunnisteella ja tyhjentää syötteen.
  function addTask() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks((previous) => {
      const id = previous.reduce((highest, task) => Math.max(highest, task.id), 0) + 1;
      return [...previous, { id, text: trimmed, done: false }];
    });
    setText('');
  }

  // vaihtaa valitun tehtävän valmiiksi tai takaisin keskeneräiseksi.
  function toggleTask(id: number) {
    setTasks((previous) => previous.map((task) => (
      task.id === id ? { ...task, done: !task.done } : task
    )));
  }

  // näyttää tehtävien syötön ja listan.
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>Tehtävälista</Text>
        {loaded && (
          <>
            <TaskInput text={text} onChangeText={setText} onSave={addTask} />
            <FlatList
              data={tasks}
              keyExtractor={(task) => task.id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TaskRow task={item} onPress={() => toggleTask(item.id)} />
              )}
            />
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

//elementtien visuaalinen ulkomuoto
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontSize: 16,
  },
  task: {
    minHeight: 48,
    justifyContent: 'center',
  },
  taskText: {
    fontSize: 16,
  },
  done: {
    backgroundColor: '#b7e4c7',
  },
});
