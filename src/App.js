import React, { useState, useEffect, useRef, useCallback } from 'react';

// Main App component
const App = () => {
  // State to hold the list of distributions (nodes)
  const [distributions, setDistributions] = useState([
    { id: 'normal', name: 'Normal', description: 'The bell curve', details: 'A continuous probability distribution that is symmetric about its mean, with data clustering around the mean and tapering off symmetrically away from it. Many natural phenomena are approximately normally distributed.' },
    { id: 'standard_normal', name: 'Standard Normal', description: 'Z-distribution', details: 'A special case of the Normal distribution with a mean of 0 and a standard deviation of 1. Any normal distribution can be transformed into a standard normal distribution (Z-score).' },
    { id: 't_dist', name: 'Student\'s t', description: 'For small samples', details: 'A probability distribution that is used when estimating the mean of a normally distributed population in situations where the sample size is small and the population standard deviation is unknown.' },
    { id: 'chi_squared', name: 'Chi-squared', description: 'Sum of squared normals', details: 'A non-negative, continuous probability distribution that arises in statistics, for example, in chi-squared tests of goodness of fit or independence.' },
    { id: 'exponential', name: 'Exponential', description: 'Waiting time between events', details: 'A continuous probability distribution that describes the time between events in a Poisson point process, i.e., a process in which events occur continuously and independently at a constant average rate.' },
    { id: 'poisson', name: 'Poisson', description: 'Count of events', details: 'A discrete probability distribution that expresses the probability of a given number of events occurring in a fixed interval of time or space if these events occur with a known constant mean rate and independently of the time since the last event.' },
    { id: 'binomial', name: 'Binomial', description: 'Successes in N trials', details: 'A discrete probability distribution of the number of successes in a sequence of n independent experiments, each asking a yes/no question, and each with its own Boolean-valued outcome: success (with probability p) or failure (with probability q = 1 − p).' },
    { id: 'bernoulli', name: 'Bernoulli', description: 'Single trial', details: 'The probability distribution of a random variable which takes the value 1 with probability p and the value 0 with probability q=1-p. It models a single trial with two outcomes.' },
    { id: 'gamma', name: 'Gamma', description: 'Generalization of Exponential', details: 'A two-parameter family of continuous probability distributions. It has a skewed shape and is often used to model waiting times until multiple events occur.' },
    { id: 'beta', name: 'Beta', description: 'Probability of a probability', details: 'A family of continuous probability distributions defined on the interval [0, 1]. It is often used to model the behavior of random variables restricted to intervals of finite length, such as probabilities.' },
    { id: 'uniform', name: 'Uniform', description: 'Equal probability over range', details: 'A probability distribution that has constant probability. For example, a uniform distribution on [a,b] assigns equal probability to all values in that interval.' }
  ]);

  // State to hold the connections between distributions (edges)
  const [connections, setConnections] = useState([
    { from: 'normal', to: 'standard_normal', type: 'standardization', label: 'Standardization (Z-score)' },
    { from: 't_dist', to: 'normal', type: 'limit', label: 'Limit (df → ∞)' },
    { from: 'chi_squared', to: 'normal', type: 'derivation', label: 'Sum of Squared Normals' },
    { from: 'exponential', to: 'poisson', type: 'relation', label: 'Waiting Time' },
    { from: 'binomial', to: 'normal', type: 'approximation', label: 'Normal Approximation (large n)' },
    { from: 'binomial', to: 'poisson', type: 'approximation', label: 'Poisson Approximation (rare events)' },
    { from: 'bernoulli', to: 'binomial', type: 'relation', label: 'Single Trial' },
    { from: 'gamma', to: 'exponential', type: 'special_case', label: 'Special Case' },
    { from: 'beta', to: 'uniform', type: 'special_case', label: 'Special Case' },
  ]);

  // State for managing positions of draggable nodes
  // Initial positions are hardcoded for demonstration, but these could be loaded from local storage
  // or a database in a more persistent app.
  const [nodePositions, setNodePositions] = useState({
    normal: { x: 300, y: 100 },
    standard_normal: { x: 550, y: 100 },
    t_dist: { x: 300, y: 250 },
    chi_squared: { x: 550, y: 250 },
    exponential: { x: 100, y: 400 },
    poisson: { x: 300, y: 400 },
    binomial: { x: 500, y: 400 },
    bernoulli: { x: 700, y: 400 },
    gamma: { x: 100, y: 550 },
    beta: { x: 500, y: 550 },
    uniform: { x: 700, y: 550 },
  });

  // State to control the visibility and content of the detail panel
  const [selectedDistribution, setSelectedDistribution] = useState(null);

  // Refs for each node element to get their actual positions on the screen
  const nodeRefs = useRef({});
  // Ref for the SVG container to ensure lines are drawn relative to it
  const svgRef = useRef(null);

  // Effect to recalculate line positions when node positions change or window resizes
  // This ensures lines stay connected as nodes are dragged or layout shifts
  const [forceUpdate, setForceUpdate] = useState(0); // Dummy state to force re-render

  useEffect(() => {
    const handleResize = () => {
      // Force a re-render to redraw lines when window is resized
      setForceUpdate(prev => prev + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Function to calculate start and end points for an SVG line based on node IDs
  const getLineCoordinates = useCallback((fromId, toId) => {
    const fromNode = nodeRefs.current[fromId];
    const toNode = nodeRefs.current[toId];
    const svgContainer = svgRef.current;

    if (fromNode && toNode && svgContainer) {
      const fromRect = fromNode.getBoundingClientRect();
      const toRect = toNode.getBoundingClientRect();
      const svgRect = svgContainer.getBoundingClientRect();

      // Calculate center points of nodes relative to the SVG container
      const startX = fromRect.left + fromRect.width / 2 - svgRect.left;
      const startY = fromRect.top + fromRect.height / 2 - svgRect.top;
      const endX = toRect.left + toRect.width / 2 - svgRect.left;
      const endY = toRect.top + toRect.height / 2 - svgRect.top;

      return { x1: startX, y1: startY, x2: endX, y2: endY };
    }
    return { x1: 0, y1: 0, x2: 0, y2: 0 }; // Default if nodes not found
  }, [nodePositions]); // Recalculate if nodePositions change

  // --- Drag & Drop Logic ---
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e, id) => {
    setDraggingNodeId(id);
    const nodeElement = nodeRefs.current[id];
    if (nodeElement) {
      const rect = nodeElement.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (draggingNodeId) {
      e.preventDefault(); // Prevent default browser drag behavior
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      setNodePositions(prevPositions => ({
        ...prevPositions,
        [draggingNodeId]: { x: newX, y: newY },
      }));
    }
  }, [draggingNodeId, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggingNodeId(null);
  }, []);

  // Attach global mouse move/up listeners when dragging starts
  useEffect(() => {
    if (draggingNodeId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNodeId, handleMouseMove, handleMouseUp]);


  // Handler for clicking on a distribution card
  const handleDistributionClick = (distribution) => {
    setSelectedDistribution(distribution);
  };

  // Function to close the detail panel
  const closeDetailPanel = () => {
    setSelectedDistribution(null);
  };

  return (
    <div
      className="relative min-h-screen bg-gray-900 overflow-hidden font-inter text-gray-100"
      // Apply mousemove/mouseup to the entire board when dragging
      // This allows dragging outside the node itself
    >
      {/* Evidence Board Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950 opacity-90"></div>
      <div className="absolute inset-0 bg-[url('https://placehold.co/1000x1000/0a0a0a/333333?text=.')] opacity-10 pointer-events-none" style={{ backgroundSize: '20px 20px' }}></div> {/* Subtle texture */}

      {/* SVG for Connections (Red Strings) */}
      <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none z-10">
        {connections.map((conn, index) => {
          const { x1, y1, x2, y2 } = getLineCoordinates(conn.from, conn.to);
          // Only render if coordinates are valid
          if (x1 === 0 && y1 === 0 && x2 === 0 && y2 === 0) return null;

          return (
            <g key={index}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                className="stroke-red-500 stroke-[3px] opacity-75 transition-all duration-300 ease-out"
                style={{ strokeDasharray: '5,5' }} // Dashed line for 'string' effect
              />
              {/* Optional: Add text label on the line */}
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 10} // Offset text slightly above line
                className="fill-red-300 text-xs font-semibold pointer-events-none"
                textAnchor="middle"
              >
                {conn.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Probability Distribution Cards (Nodes) */}
      <div className="relative z-20">
        {distributions.map((dist) => (
          <div
            key={dist.id}
            ref={el => nodeRefs.current[dist.id] = el}
            className={`
              absolute bg-gray-700/70 backdrop-blur-sm
              rounded-lg shadow-xl p-4 cursor-grab
              border-2 border-gray-600 hover:border-red-500 transition-all duration-200
              ${draggingNodeId === dist.id ? 'cursor-grabbing z-50 ring-4 ring-red-500/50' : ''}
            `}
            style={{
              left: nodePositions[dist.id]?.x,
              top: nodePositions[dist.id]?.y,
              width: '200px', // Fixed width for consistent look
              minHeight: '100px',
            }}
            onMouseDown={(e) => handleMouseDown(e, dist.id)}
            onClick={() => handleDistributionClick(dist)}
          >
            <h3 className="text-lg font-bold text-red-300 mb-1">{dist.name}</h3>
            <p className="text-sm text-gray-300">{dist.description}</p>
            {/* Simple pin icon */}
            <div className="absolute -top-3 -left-3 bg-red-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1v6" /><path d="M10 5l4 4" /><path d="M14 5l-4 4" /><path d="M12 18v3" /><path d="M10 21l4-4" /><path d="M14 21l-4-4" /><circle cx="12" cy="12" r="3" />
                </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full md:w-96 bg-gray-800/95 backdrop-blur-lg
          shadow-2xl z-40 p-6 transform transition-transform duration-300 ease-in-out
          border-l-2 border-red-700
          ${selectedDistribution ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-extrabold text-red-300">
            {selectedDistribution?.name || 'Details'}
          </h2>
          <button
            onClick={closeDetailPanel}
            className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {selectedDistribution ? (
          <>
            <p className="text-gray-300 mb-4">{selectedDistribution.description}</p>
            <p className="text-gray-200 leading-relaxed mb-6">{selectedDistribution.details}</p>

            <h3 className="text-lg font-semibold text-red-200 mb-2">Related Distributions:</h3>
            <ul className="list-disc list-inside text-gray-300">
              {connections
                .filter(conn => conn.from === selectedDistribution.id || conn.to === selectedDistribution.id)
                .map((conn, index) => (
                  <li key={index} className="mb-1">
                    {conn.from === selectedDistribution.id
                      ? `Connects to ${distributions.find(d => d.id === conn.to)?.name} via: `
                      : `Connects from ${distributions.find(d => d.id === conn.from)?.name} via: `}
                    <span className="font-medium text-red-400">{conn.label}</span>
                  </li>
                ))}
              {connections.filter(conn => conn.from === selectedDistribution.id || conn.to === selectedDistribution.id).length === 0 && (
                <li>No specific connections defined yet.</li>
              )}
            </ul>
          </>
        ) : (
          <p className="text-gray-400">Click on a distribution card to see its details.</p>
        )}
      </div>

      {/* Global styles for Inter font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
      {/* Tailwind CSS CDN */}
      <script src="https://cdn.tailwindcss.com"></script>
    </div>
  );
};

export default App;