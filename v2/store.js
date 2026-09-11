'use strict';

// A separate database and one atomic document per transaction. No v1 keys are read or written.
window.SstmStore = (() => {
  let db;
  async function open() {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('trckng-v2-local-alpha', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('state');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Закрой другие вкладки пробы и открой её снова.'));
    });
    db.onversionchange = () => db.close();
    return transact(null);
  }
  function transact(command) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('state', 'readwrite');
      const store = transaction.objectStore('state');
      let world, result, failure;
      const request = store.get('world');
      request.onsuccess = () => {
        try {
          world = request.result || SstmModel.createWorld();
          if (world.schema !== 1 || world.stage !== 'local-alpha') throw new Error('Данные созданы другой версией. Они сохранены без изменений.');
          if (command) result = SstmModel.apply(world, command);
          if (command || !request.result) store.put(world, 'world');
        } catch (error) { failure = error; transaction.abort(); }
      };
      transaction.oncomplete = () => resolve({ world, result });
      transaction.onabort = () => reject(failure || transaction.error || new Error('Не удалось сохранить. Действие не применено.'));
      transaction.onerror = () => {};
    });
  }
  return { open, transact };
})();
