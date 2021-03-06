'use strict';

const autoBind = require('auto-bind');
const fs = require('fs');
const path = require('path');
const stackTrace = require('stack-trace');
const JSONSerializer = require('./Serializers/JSONSerializer');
const uuid = require('uuid');

class FSRepository {
  constructor(filePath, strategy) {
    const trace = stackTrace.get();
    const caller = trace[1].getFileName();
    if (!path) throw new Error('File path is required.');
    this.path = path.isAbsolute(filePath) ? filePath : path.join(path.dirname(caller), filePath);
    this.strategy = strategy || new JSONSerializer();

    autoBind(this);
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  use(strategy) {
    this.strategy = strategy;
  }

  clear(cb) {
    cb(null, fs.writeFileSync(this.path, this.strategy.serialize(''), 'utf-8'));
  }

  disconnect() {

  }

  read(path, cb) {
    const self = this;
    fs.open(path, 'r', err => {
      if (err) {
        fs.writeFile(path, self.strategy.serialize({}), err => {
          if (err) {
            return cb(err, null);
          }
          return cb(null, {});
        });
      } else {
        return cb(null, this.strategy.deserialize(fs.readFileSync(path, 'utf-8')));
      }
    });
  }

  write(path, data, cb) {
    fs.open(path, 'r+', err => {
      if (err) {
        fs.writeFile(path, '', err => {
          if (err) {
            return cb(err, null);
          }
          return cb(null, true);
        });
      } else {
        const str = this.strategy.serialize(data);
        fs.writeFile(path, str, err => {
          if (err) {
            return cb(err, null);
          }
          return cb(null, true);
        });
      }
    });
  }

  findAll(cb) {
    this.read(this.path, (err, data) => {
      if (err) {
        return cb(err);
      }
      cb(null, Object.keys(data).map(x => data[x]));
    });
  }

  findOne(id, cb) {
    this.read(this.path, (err, data) => {
      if (err) {
        return cb(err);
      }
      cb(null, data[id]);
    });
  }

  update(entity, cb) {
    const self = this;
    this.read(this.path, (err, data) => {
      data[entity._id] = entity;
      self.write(self.path, data, err => {
        if (err) return cb(err);
        return cb(null, entity);
      });
    });
  }

  add(entity, cb) {
    const self = this;
    this.read(this.path, (err, data) => {
      entity._id = uuid.v4();
      data[entity._id] = entity;
      self.write(self.path, data, err => {
        if (err) return cb(err);
        return cb(null, entity);
      });
    });
  }

  remove(id, cb) {
    const self = this;
    this.read(this.path, (err, data) => {
      const copy = Object.assign({}, data[id]);
      delete data[id];
      self.write(self.path, data, err => {
        if (err) {
          return cb(err);
        }
        cb(null, copy);
      });
    });

  }
}

module.exports = FSRepository;