import React, { useState, useEffect } from 'react';

// 1. Initial Mock Data (Only used if memory is empty)
const DEFAULT_CARS = [
  {
    id: 1,
    year: 2008,
    make: "Honda",
    model: "Fit",
    trim: "Sport",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/df/2009_Honda_Fit_Sport_--_08-26-2009.jpg/1200px-2009_Honda_Fit_Sport_--_08-26-2009.jpg", 
    mods: ["Coilovers", "Cold Air Intake", "Bronze Wheels"]
  },
  {
    id: 2,
    year: 2016,
    make: "Honda",
    model: "Accord",
    trim: "Touring",
    image: "https://file.kelleybluebook.net/kbb/base/house/2016/2016-Honda-Accord-FrontSide_HOACC1601_640x480.jpg",
    mods: ["Tinted Windows", "LED Fog Lights"]
  }
];

function App() {
  // --- LOAD FROM MEMORY ---
  // This function runs ONCE when the app starts
  const [cars, setCars] = useState(() => {
    const saved = localStorage.getItem("modlog_cars");
    if (saved) {
      return JSON.parse(saved); // Turn string back into array
    } else {
      return DEFAULT_CARS; // Start with defaults
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [newCar, setNewCar] = useState({ year: '', make: '', model: '', trim: '', image: '' });
  const [modInputs, setModInputs] = useState({});

  // --- SAVE TO MEMORY ---
  // This runs every time 'cars' changes
  useEffect(() => {
    localStorage.setItem("modlog_cars", JSON.stringify(cars));
  }, [cars]);

  // --- ACTIONS ---

  const handleAddCar = () => {
    const carToAdd = {
      id: Date.now(),
      year: newCar.year,
      make: newCar.make,
      model: newCar.model,
      trim: newCar.trim,
      image: newCar.image || `https://placehold.co/600x400?text=${newCar.make}+${newCar.model}`,
      mods: []
    };
    setCars([...cars, carToAdd]);
    setShowForm(false);
    setNewCar({ year: '', make: '', model: '', trim: '', image: '' });
  };

  const handleAddMod = (carId) => {
    const modText = modInputs[carId];
    if (!modText) return;

    const updatedCars = cars.map(car => {
      if (car.id === carId) {
        return { ...car, mods: [...car.mods, modText] };
      }
      return car;
    });

    setCars(updatedCars);
    setModInputs({ ...modInputs, [carId]: '' });
  };
  
  // (New) Delete Feature
  const handleDeleteCar = (carId) => {
    if(confirm("Are you sure you want to delete this build?")) {
      setCars(cars.filter(car => car.id !== carId));
    }
  }

  // --- STYLES ---
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
    deleteButton: { position: 'absolute', top: '10px', right: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold' }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>🏎️ ModLog</h1>
      
      {cars.map((car) => (
        <div key={car.id} style={styles.card}>
          <button style={styles.deleteButton} onClick={() => handleDeleteCar(car.id)}>X</button>
          <img src={car.image} alt={car.model} style={styles.carImage} 
               onError={(e) => e.target.src = 'https://placehold.co/600x400?text=No+Image'} />
          
          <h2 style={styles.carTitle}>{car.year} {car.make} {car.model}</h2>
          <p style={styles.trimText}>Trim: {car.trim}</p>
          
          <div style={styles.modSection}>
            <h4>Modifications:</h4>
            <ul style={styles.modList}>
              {car.mods.length > 0 ? car.mods.map((mod, i) => <li key={i}>{mod}</li>) : <p style={{fontStyle:'italic', color:'#999'}}>Stock (No mods yet)</p>}
            </ul>

            <div style={styles.modInputGroup}>
              <input 
                type="text" 
                placeholder="Add a mod (e.g. Turbo)" 
                style={styles.modInput}
                value={modInputs[car.id] || ''}
                onChange={(e) => setModInputs({...modInputs, [car.id]: e.target.value})}
              />
              <button style={styles.modButton} onClick={() => handleAddMod(car.id)}>Add</button>
            </div>
          </div>
        </div>
      ))}

      {showForm ? (
        <div style={styles.card}>
          <h3>Add New Build</h3>
          <input placeholder="Year" style={styles.input} value={newCar.year} onChange={e => setNewCar({...newCar, year: e.target.value})} />
          <input placeholder="Make" style={styles.input} value={newCar.make} onChange={e => setNewCar({...newCar, make: e.target.value})} />
          <input placeholder="Model" style={styles.input} value={newCar.model} onChange={e => setNewCar({...newCar, model: e.target.value})} />
          <input placeholder="Trim" style={styles.input} value={newCar.trim} onChange={e => setNewCar({...newCar, trim: e.target.value})} />
          <input placeholder="Image URL (Optional)" style={styles.input} value={newCar.image} onChange={e => setNewCar({...newCar, image: e.target.value})} />
          
          <button style={{...styles.button, backgroundColor: '#28a745'}} onClick={handleAddCar}>Save Build</button>
          <button style={{...styles.button, backgroundColor: '#6c757d'}} onClick={() => setShowForm(false)}>Cancel</button>
        </div>
      ) : (
        <button style={styles.button} onClick={() => setShowForm(true)}>+ Add New Build</button>
      )}
    </div>
  );
}

export default App;