/* ======================================
   Study With Me - Database Manager (Firestore)
   ====================================== */

const DB = {
  // ======== Get all items of a type for a year ========
  async getAll(type, year) {
    try {
      let query = db.collection(type)
        .where('year', '==', String(year));
      
      // Subjects don't need ordering by createdAt
      if (type !== 'subjects') {
        query = query.orderBy('createdAt', 'desc');
      }
      
      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting ${type}:`, error);
      return [];
    }
  },

  // ======== Add a new item ========
  async add(type, data) {
    try {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.year = String(data.year);
      const docRef = await db.collection(type).add(data);
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error(`Error adding ${type}:`, error);
      throw error;
    }
  },

  // ======== Delete an item ========
  async delete(type, id) {
    try {
      await db.collection(type).doc(id).delete();
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      throw error;
    }
  },

  // ======== Get count for a type and year ========
  async getCount(type, year) {
    try {
      const snapshot = await db.collection(type)
        .where('year', '==', String(year))
        .get();
      return snapshot.size;
    } catch (error) {
      console.error(`Error counting ${type}:`, error);
      return 0;
    }
  },

  // ======== Get total count across all years ========
  async getTotalCount(type) {
    try {
      const snapshot = await db.collection(type).get();
      return snapshot.size;
    } catch (error) {
      console.error(`Error counting total ${type}:`, error);
      return 0;
    }
  },

  // ======== Search items ========
  async search(type, year, query) {
    const items = await this.getAll(type, year);
    if (!query) return items;
    query = query.toLowerCase();
    return items.filter(item => {
      return (item.title && item.title.toLowerCase().includes(query)) ||
             (item.subject && item.subject.toLowerCase().includes(query)) ||
             (item.content && item.content.toLowerCase().includes(query));
    });
  }
};
