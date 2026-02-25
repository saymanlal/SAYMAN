import { Level } from 'level';
import Block from '../core/block.js';

class Database {
  constructor(network) {
    this.db = new Level(`./data/${network}`, { valueEncoding: 'json' });
  }

  async saveChain(chain) {
    const chainData = chain.map(block => block.toJSON());
    await this.db.put('chain', chainData);
  }

  async getChain() {
    try {
      const chainData = await this.db.get('chain');
      const promises = chainData.map(blockData => Block.fromJSON(blockData));
      return await Promise.all(promises);
    } catch (error) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  async close() {
    await this.db.close();
  }
}

export default Database;