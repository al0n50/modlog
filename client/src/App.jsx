import React, { useState, useEffect } from 'react';

const DEFAULT_CARS = [
  {
    id: 1,
    year: 2008,
    make: "Honda",
    model: "Fit",
    trim: "Sport",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/df/2009_Honda_Fit_Sport_--_08-26-2009.jpg/1200px-2009_Honda_Fit_Sport_--_08-26-2009.jpg",
    mods: ["Coilovers", "Cold Air Intake", "Bronze Wheels"],
    wishlist: ["Short Shifter", "Skunk2 Header"]
  },
  {
    id: 2,
    year: 2016,
    make: "Honda",
    model: "Accord",
    trim: "Touring",
    image: "https://file.kelleybluebook.net/kbb/base/house/2016/2016-Honda-Accord-FrontSide_HOACC1601_640x480.jpg",
    mods: ["Tinted Windows", "LED Fog Lights"],
    wishlist: []
  }
];

// [NEW] Migrate legacy localStorage data that predates the wishlist field
function migrateCars(cars) {
  return cars.map(car => ({
    ...car,
    wishlist: car.wishlist ?? [],
  }));
}

function App() {
  const [cars, setCars] = useState(() => {
    const saved = localStorage.getItem("modlog_cars");
    if (saved) {
      return migrateCars(JSON.parse(saved));
    }
    return DEFAULT_CARS;
  });

  const [showForm, setShowForm] = useState(false);
  const [newCar, setNewCar] = useState({ year: '', make: '', model: '', trim: '', image: '' });
  const [modInputs, setModInputs] = useState({});
  const [wishInputs, setWishInputs] = useState({});        // [NEW]
  const [activeTab, setActiveTab] = useState({});           // [NEW] { [carId]: 'installed' | 'wishlist' }

  useEffect(() => {
    localStorage.setItem("modlog_cars", JSON.stringify(cars));
  }, [cars]);

  // [NEW] Helper: get active tab for a card, defaulting to 'installed'
  const getTab = (carId) => activeTab[carId] ?? 'installed';

  const handleAddCar = () => {
    const carToAdd = {
      id: Date.now(),
      year: newCar.year,
      make: newCar.make,
      model: newCar.model,
      trim: newCar.trim,
      image: newCar.image || `https://placehold.co/600x400?text=${newCar.make}+${newCar.model}`,
      mods: [],
      wishlist: [], // [NEW]
    };
    setCars([...cars, carToAdd]);
    setShowForm(false);
    setNewCar({ year: '', make: '', model: '', trim: '', image: '' });
  };

  const handleAddMod = (carId) => {
    const modText = modInputs[carId];
    if (!modText?.trim()) return;
    setCars(cars.map(car =>
      car.id === carId ? { ...car, mods: [...car.mods, modText.trim()] } : car
    ));
    setModInputs({ ...modInputs, [carId]: '' });
  };

  // [NEW] Add item to wishlist
  const handleAddWish = (carId) => {
    const wishText = wishInputs[carId];
    if (!wishText?.trim()) return;
    setCars(cars.map(car =>
      car.id === carId ? { ...car, wishlist: [...car.wishlist, wishText.trim()] } : car
    ));
    setWishInputs({ ...wishInputs, [carId]: '' });
  };

  // [NEW] Promote wishlist item → installed mods (Story 1.2)
  const handlePromoteWish = (carId, wishIndex) => {
    setCars(cars.map(car => {
      if (car.id !== carId) return car;
      const item = car.wishlist[wishIndex];
      return {
        ...car,
        mods: [...car.mods, item],
        wishlist: car.wishlist.filter((_, i) => i !== wishIndex),
      };
    }));
  };

  // [NEW] Delete wishlist item
  const handleDeleteWish = (carId, wishIndex) => {
    setCars(cars.map(car =>
      car.id === carId
        ? { ...car, wishlist: car.wishlist.filter((_, i) => i !== wishIndex) }
        : car
    ));
  };

  const handleDeleteCar = (carId) => {
    if (confirm("Are you sure you want to delete this build?")) {
      setCars(cars.filter(car => car.id !== carId));
    }
  };

  const styles = {
    container: { fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f4f4f5', minHeight: '100vh', padding: '20px' },
    header: { textAlign: 'center', color: '#333', marginBottom: '30px' },
    card: { backgroundColor: 'white', borderRadius: '12px', padding: '15px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position: 'relative' },
    carImage: { width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' },
    carTitle: { margin: '0 0 5px 0', fontSize: '1.5rem', color: '#222' },
    trimText: { color: '#666', marginTop: 0 },
    modSection: { marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' },
    modList: { paddingLeft: '20px', color: '#555', marginBottom: '10px' },
    button: { display: 'block', width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', marginTop: '10px' },
    input: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem', boxSizing: 'border-box' },
    modInputGroup: { display: 'flex', gap: '5px' },
    modInput: { flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ddd' },
    modButton: { padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    deleteButton: { position: 'absolute', top: '10px', right: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold' },

    // [NEW] Tab styles
    tabRow: { display: 'flex', gap: '0', marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' },
    tab: (active) => ({
      flex: 1, padding: '8px', textAlign: 'center', cursor: 'pointer', fontSize: '0.875rem', fontWeight: active ? 'bold' : 'normal',
      backgroundColor: active ? '#007bff' : '#f8f9fa', color: active ? 'white' : '#555',
      border: 'none', transition: 'background-color 0.15s',
    }),

    // [NEW] Wishlist row
    wishRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' },
    wishLabel: { flex: 1, color: '#555', fontSize: '0.95rem' },
    promoteButton: { padding: '4px 8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' },
    removeWishButton: { padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>🏎️ ModLog</h1>

      {cars.map((car) => {
        const tab = getTab(car.id);
        return (
          <div key={car.id} style={styles.card}>
            <button style={styles.deleteButton} onClick={() => handleDeleteCar(car.id)}>X</button>
            <img
              src={car.image} alt={car.model} style={styles.carImage}
              onError={(e) => e.target.src = 'https://placehold.co/600x400?text=No+Image'}
            />

            <h2 style={styles.carTitle}>{car.year} {car.make} {car.model}</h2>
            <p style={styles.trimText}>Trim: {car.trim}</p>

            <div style={styles.modSection}>
              {/* [NEW] Tab toggle */}
              <div style={styles.tabRow}>
                <button
                  style={styles.tab(tab === 'installed')}
                  onClick={() => setActiveTab({ ...activeTab, [car.id]: 'installed' })}
                >
                  ✅ Installed ({car.mods.length})
                </button>
                <button
                  style={styles.tab(tab === 'wishlist')}
                  onClick={() => setActiveTab({ ...activeTab, [car.id]: 'wishlist' })}
                >
                  🛒 Wishlist ({car.wishlist.length})
                </button>
              </div>

              {/* Installed Mods Panel */}
              {tab === 'installed' && (
                <>
                  <ul style={styles.modList}>
                    {car.mods.length > 0
                      ? car.mods.map((mod, i) => <li key={i}>{mod}</li>)
                      : <p style={{ fontStyle: 'italic', color: '#999' }}>Stock (No mods yet)</p>
                    }
                  </ul>
                  <div style={styles.modInputGroup}>
                    <input
                      type="text"
                      placeholder="Add a mod (e.g. Turbo)"
                      style={styles.modInput}
                      value={modInputs[car.id] || ''}
                      onChange={(e) => setModInputs({ ...modInputs, [car.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMod(car.id)}
                    />
                    <button style={styles.modButton} onClick={() => handleAddMod(car.id)}>Add</button>
                  </div>
                </>
              )}

              {/* [NEW] Wishlist Panel */}
              {tab === 'wishlist' && (
                <>
                  <div style={{ marginBottom: '10px' }}>
                    {car.wishlist.length > 0
                      ? car.wishlist.map((item, i) => (
                          <div key={i} style={styles.wishRow}>
                            <span style={styles.wishLabel}>🔧 {item}</span>
                            <button
                              style={styles.promoteButton}
                              onClick={() => handlePromoteWish(car.id, i)}
                              title="Mark as installed"
                            >
                              ✅ Installed
                            </button>
                            <button
                              style={styles.removeWishButton}
                              onClick={() => handleDeleteWish(car.id, i)}
                              title="Remove from wishlist"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      : <p style={{ fontStyle: 'italic', color: '#999' }}>No parts on the wishlist yet.</p>
                    }
                  </div>
                  <div style={styles.modInputGroup}>
                    <input
                      type="text"
                      placeholder="Add to wishlist (e.g. Enkei Wheels)"
                      style={styles.modInput}
                      value={wishInputs[car.id] || ''}
                      onChange={(e) => setWishInputs({ ...wishInputs, [car.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddWish(car.id)}
                    />
                    <button style={{ ...styles.modButton, backgroundColor: '#fd7e14' }} onClick={() => handleAddWish(car.id)}>Add</button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}

      {showForm ? (
        <div style={styles.card}>
          <h3>Add New Build</h3>
          <input placeholder="Year" style={styles.input} value={newCar.year} onChange={e => setNewCar({ ...newCar, year: e.target.value })} />
          <input placeholder="Make" style={styles.input} value={newCar.make} onChange={e => setNewCar({ ...newCar, make: e.target.value })} />
          <input placeholder="Model" style={styles.input} value={newCar.model} onChange={e => setNewCar({ ...newCar, model: e.target.value })} />
          <input placeholder="Trim" style={styles.input} value={newCar.trim} onChange={e => setNewCar({ ...newCar, trim: e.target.value })} />
          <input placeholder="Image URL (Optional)" style={styles.input} value={newCar.image} onChange={e => setNewCar({ ...newCar, image: e.target.value })} />

          <button style={{ ...styles.button, backgroundColor: '#28a745' }} onClick={handleAddCar}>Save Build</button>
          <button style={{ ...styles.button, backgroundColor: '#6c757d' }} onClick={() => setShowForm(false)}>Cancel</button>
        </div>
      ) : (
        <button style={styles.button} onClick={() => setShowForm(true)}>+ Add New Build</button>
      )}
    </div>
  );
}

export default App;