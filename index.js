import merge from 'deepmerge';
import shvl from 'shvl';

export default function(options, storage, key, ignore) {
  options = options || {};
  storage = options.storage || (window && window.localStorage);
  key = options.key || 'vuex';
  ignore = (options.ignore && options.ignore.length) || null;

  function canWriteStorage(storage) {
    try {
      storage.setItem('@@', 1);
      storage.removeItem('@@');
      return true;
    } catch (e) {}

    return false;
  }

  function getState(key, storage, value) {
    try {
      if ((value = storage.getItem(key)) && value !== 'undefined') {
        var state = JSON.parse(value);
        if (ignore) {
          for (var i in ignore) {
            var ig = ignore[i];
            delete state[ig];
          }
        }
        return state;
      } else {
        return undefined;
      }
    } catch (err) {}

    return undefined;
  }

  function filter() {
    return true;
  }

  function setState(key, state, storage) {
    return storage.setItem(key, JSON.stringify(state));
  }

  function reducer(state, paths) {
    return paths.length === 0
      ? state
      : paths.reduce(function(substate, path) {
          return shvl.set(substate, path, shvl.get(state, path));
        }, {});
  }

  function subscriber(store) {
    return function(handler) {
      return store.subscribe(handler);
    };
  }

  if (!canWriteStorage(storage)) {
    throw new Error('Invalid storage instance given');
  }

  return function(store) {
    const savedState = shvl.get(options, 'getState', getState)(key, storage);

    if (typeof savedState === 'object' && savedState !== null) {
      store.replaceState(
        merge(store.state, savedState, {
          arrayMerge:
            options.arrayMerger ||
            function(store, saved) {
              return saved;
            },
          clone: false
        })
      );
    }

    (options.subscriber || subscriber)(store)(function(mutation, state) {
      if ((options.filter || filter)(mutation)) {
        (options.setState || setState)(
          key,
          (options.reducer || reducer)(state, options.paths || []),
          storage
        );
      }
    });
  };
}
