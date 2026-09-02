import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { initialCustomers, initialProducts } from "./mockData.js";
import browserSeedData from "./browser-seed-data.json";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const emptyProduct = { name: "", category: "Apparel", price: "", stock: "" };
const emptyCustomer = { name: "", email: "", tier: "Member" };
const skuLocations = [
  "Temple - 499",
  "San Francisco - 220",
  "Westlake Village - 101",
  "Austin - 446",
  "KCDC - 985",
];
const homeSkuLocation = "Temple - 499";
const fulfillmentLabel = (location) =>
  location === homeSkuLocation ? "In-store" : location;
const palettes = {
  navy: { name: "Midnight Navy", accent: "#e4fa59", ink: "#14213b" },
  matrix: { name: "Phosphor Green", accent: "#6dff8a", ink: "#06351a" },
  amber: { name: "Amber Terminal", accent: "#ffc857", ink: "#4a2600" },
  cobalt: { name: "Cobalt Blue", accent: "#7db4ff", ink: "#12336b" },
  plum: { name: "Signal Plum", accent: "#f0a5ff", ink: "#42105b" },
};
const CustomerContext = createContext([]);
const bundledProducts = browserSeedData.products?.length
  ? browserSeedData.products
  : initialProducts;
const bundledCustomers = browserSeedData.customers?.length
  ? browserSeedData.customers
  : initialCustomers;
const salesAssociates = [
  { employeeNumber: "800027", name: "Tim Eggenberger", email: "tim.eggenberger@example.com" },
  { employeeNumber: "800143", name: "Jordan Ellis", email: "jordan.ellis@example.com" },
  { employeeNumber: "800258", name: "Avery Patel", email: "avery.patel@example.com" },
  { employeeNumber: "800391", name: "Morgan James", email: "morgan.james@example.com" },
];

function Icon({ name }) {
  const icons = {
    dashboard: "▦",
    database: "▤",
    sale: "⌁",
    inventory: "□",
    customers: "♙",
    reports: "◔",
    settings: "⚙",
    search: "⌕",
    plus: "+",
    close: "×",
    trash: "⌫",
    edit: "✎",
  };
  return (
    <span className="icon" aria-hidden="true">
      {icons[name]}
    </span>
  );
}

function DeliveryTruckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7zM7 18a2 2 0 1 0 0 .01M18 18a2 2 0 1 0 0 .01" />
    </svg>
  );
}

function BarcodeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4v16M6 4v16M9 4v16M12 4v16M15 4v16M19 4v16M21 4v16" />
    </svg>
  );
}

export default function App() {
  const [view, setView] = useState("Sales Ticket Processing");
  const [products, setProducts] = useState(() => {
    try {
      const saved =
        JSON.parse(localStorage.getItem("gc-pos-products")) ?? bundledProducts;
      return saved.map((product) => ({
        ...product,
        id: product.itemNumber ?? product.id,
        location: product.location ?? "Temple - 499",
        promotionalFinancingTerm: product.promotionalFinancingTerm ?? 6,
      }));
    } catch {
      return bundledProducts.map((product) => ({
        ...product,
        id: product.itemNumber ?? product.id,
        location: product.location ?? "Temple - 499",
        promotionalFinancingTerm: product.promotionalFinancingTerm ?? 6,
      }));
    }
  });
  const [customers, setCustomers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gc-pos-customers"));
      return saved
        ? [
            ...saved,
            ...bundledCustomers.filter(
              (customer) =>
                !saved.some(
                  (savedCustomer) => savedCustomer.id === customer.id,
                ),
            ),
          ]
        : bundledCustomers;
    } catch {
      return bundledCustomers;
    }
  });
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const [ticketScreen, setTicketScreen] = useState("menu");
  const [mobileTicketActive, setMobileTicketActive] = useState(false);
  const [mobileTicketSection, setMobileTicketSection] = useState("cart");
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const mobileScanHoldTimer = useRef(null);
  const mobileScanButtonHeld = useRef(false);
  const [ticketQuery, setTicketQuery] = useState("");
  const [pendingCommand, setPendingCommand] = useState("");
  const [appearance, setAppearance] = useState(() => {
    try {
      return {
        dark: false,
        text: "modern",
        palette: "navy",
        ...JSON.parse(localStorage.getItem("gc-pos-appearance")),
      };
    } catch {
      return { dark: false, text: "modern", palette: "navy" };
    }
  });

  const nav = [
    { name: "Dashboard", icon: "dashboard" },
    { name: "Master Database Management", icon: "database" },
    { name: "Sales Ticket Processing", icon: "sale" },
    { name: "Inventory Management", icon: "inventory" },
    { name: "Sales Analysis & Commissions", icon: "reports" },
  ];
  const productResults = useMemo(
    () =>
      products.filter((p) =>
        `${p.name} ${p.id} ${p.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [products, query],
  );
  const subtotal = cart.reduce(
    (total, line) => total + line.price * line.quantity,
    0,
  );
  const tax = subtotal * 0.0825;

  useEffect(
    () => localStorage.setItem("gc-pos-appearance", JSON.stringify(appearance)),
    [appearance],
  );
  useEffect(
    () => localStorage.setItem("gc-pos-customers", JSON.stringify(customers)),
    [customers],
  );
  useEffect(
    () => localStorage.setItem("gc-pos-products", JSON.stringify(products)),
    [products],
  );
  useEffect(() => {
    function handleTerminalNavigation(event) {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const menuCommand =
        view === "Sales Ticket Processing" && ticketScreen === "menu";
      const masterMenuCommand = view === "Master Database Management";
      const inventoryMenuCommand = view === "Inventory Management";
      const dashboardCommand = view === "Dashboard";
      const validKey = dashboardCommand
        ? ["1", "2", "3", "4"]
        : menuCommand || masterMenuCommand || inventoryMenuCommand
          ? ["1", "2"]
          : ["2", "3"];
      if (validKey.includes(event.key)) {
        setPendingCommand(event.key);
        event.preventDefault();
        return;
      }
      if (event.key === "Escape") {
        setPendingCommand("");
        return;
      }
      if (event.key === "Enter" && !pendingCommand && view !== "Dashboard") {
        setView("Dashboard");
        setTicketScreen("menu");
        event.preventDefault();
        return;
      }
      if (event.key !== "Enter" || !pendingCommand) return;
      if (menuCommand && pendingCommand === "1") setTicketScreen("entry");
      if (menuCommand && pendingCommand === "2") setTicketScreen("search");
      if (masterMenuCommand && pendingCommand === "1") setView("Customers");
      if (masterMenuCommand && pendingCommand === "2")
        setView("Sales Person Master");
      if (inventoryMenuCommand && pendingCommand === "1")
        setView("SKU Maintenance");
      if (inventoryMenuCommand && pendingCommand === "2")
        setView("Item Lookup");
      if (dashboardCommand && pendingCommand === "1")
        setView("Master Database Management");
      if (dashboardCommand && pendingCommand === "2") {
        setView("Sales Ticket Processing");
        setTicketScreen("menu");
      }
      if (dashboardCommand && pendingCommand === "3")
        setView("Inventory Management");
      if (dashboardCommand && pendingCommand === "4")
        setView("Sales Analysis & Commissions");
      if (
        !menuCommand &&
        !masterMenuCommand &&
        !inventoryMenuCommand &&
        pendingCommand === "2"
      ) {
        setView("Sales Ticket Processing");
        setTicketScreen("menu");
      }
      if (
        !menuCommand &&
        !masterMenuCommand &&
        !inventoryMenuCommand &&
        pendingCommand === "3"
      )
        setView("Inventory Management");
      setPendingCommand("");
      event.preventDefault();
    }
    window.addEventListener("keydown", handleTerminalNavigation);
    return () =>
      window.removeEventListener("keydown", handleTerminalNavigation);
  }, [view, ticketScreen, pendingCommand]);

  function toast(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }
  function addToCart(product) {
    if (product.stock < 1) return toast("That item is out of stock.");
    setCart((current) =>
      current.some((line) => line.id === product.id)
        ? current.map((line) =>
            line.id === product.id
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          )
        : [...current, { ...product, quantity: 1 }],
    );
  }
  function adjustCart(id, amount) {
    setCart((current) =>
      current.flatMap((line) =>
        line.id !== id
          ? [line]
          : line.quantity + amount > 0
            ? [{ ...line, quantity: line.quantity + amount }]
            : [],
      ),
    );
  }
  function completeSale() {
    if (!cart.length) return toast("Add an item before completing a sale.");
    setProducts((current) =>
      current.map((product) => {
        const line = cart.find((item) => item.id === product.id);
        return line
          ? {
              ...product,
              stock: product.stock - line.quantity,
              status:
                product.stock - line.quantity <= 0
                  ? "Out of stock"
                  : product.stock - line.quantity <= 5
                    ? "Low stock"
                    : "Active",
            }
          : product;
      }),
    );
    setCart([]);
    toast("Sale completed — mock inventory updated.");
  }
  function saveProduct(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const stock = Number(data.quantity);
    const itemNumber =
      modal.item?.itemNumber ??
      String(Math.floor(1000000000 + Math.random() * 9000000000));
    const item = {
      id: itemNumber,
      itemNumber,
      name: data.description,
      description: data.description,
      productDetails: data.productDetails,
      proCoverageEligible: data.proCoverageEligible === "true",
      promotionalFinancingTerm: Number(data.promotionalFinancingTerm ?? 6),
      category: data.category,
      price: Number(data.price),
      stock,
      quantity: stock,
      location: data.location,
      fulfillment: data.location,
      thumbnail: data.thumbnail || "/product-placeholder.svg",
      status:
        stock === 0 ? "Out of stock" : stock <= 5 ? "Low stock" : "Active",
    };
    setProducts((current) =>
      modal.item
        ? current.map((p) => (p.id === item.id ? item : p))
        : [item, ...current],
    );
    setModal(null);
    toast(modal.item ? "Inventory item updated." : "Inventory item created.");
  }
  function saveCustomer(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const item = {
      id: modal.item?.id ?? `CUS-${Math.floor(1000 + Math.random() * 8999)}`,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`.trim(),
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      phone: data.phone,
      email: data.email,
      tier: data.tier,
      visits: modal.item?.visits ?? 0,
      spend: modal.item?.spend ?? 0,
    };
    setCustomers((current) =>
      modal.item
        ? current.map((c) => (c.id === item.id ? item : c))
        : [item, ...current],
    );
    setModal(null);
    toast(modal.item ? "Customer profile updated." : "Customer created.");
  }

  const palette = palettes[appearance.palette];
  return (
    <div
      className={`app-shell ${appearance.dark ? "dark-mode" : ""} ${appearance.text === "terminal" ? "terminal-text" : ""} ${appearance.dark && appearance.text === "terminal" && appearance.palette === "matrix" ? "matrix-terminal" : ""} ${mobileTicketActive ? `mobile-ticket-active mobile-ticket-${mobileTicketSection}` : ""}`}
      style={{ "--accent": palette.accent, "--ink": palette.ink }}
    >
      <aside className="sidebar">
        <div className="brand">
          <img
            className="gc-logo"
            src="/guitar-center-logo.jpg"
            alt="Guitar Center"
          />
        </div>
        <div className="store">
          <span className="store-dot"></span>
          <div>
            <strong>Temple</strong>
            <small>Store #499 · Open</small>
          </div>
          <span>⌄</span>
        </div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.name}
              className={view === item.name ? "active" : ""}
              onClick={() => {
                setView(item.name);
                if (item.name === "Sales Ticket Processing")
                  setTicketScreen("menu");
              }}
            >
              <Icon name={item.icon} />
              {item.name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={view === "Settings" ? "active" : ""}
            onClick={() => setView("Settings")}
          >
            <Icon name="settings" />
            Settings
          </button>
          <div className="clerk">
            <div className="avatar">TE</div>
            <div>
              <strong>Tim Eggenberger</strong>
              <small>Store Manager</small>
            </div>
            <span>⋮</span>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">
              {view === "Sales Ticket Processing"
                ? "POINT OF SALE"
                : "OPERATIONS"}
            </p>
            <h1>{view}</h1>
          </div>
          <div className="header-actions">
            <button className="help">?</button>
            <button className="bell">
              ♧<i></i>
            </button>
            <button className="avatar top">TE</button>
          </div>
        </header>
        {view === "Sales Ticket Processing" && ticketScreen === "menu" && (
          <TicketMenu onSelect={setTicketScreen} />
        )}
        {view === "Sales Ticket Processing" && ticketScreen === "entry" && (
          <CustomerContext.Provider value={customers}>
            <TicketEntry
              products={products}
              customers={customers}
              onExit={() => {
                setView("Dashboard");
                setTicketScreen("menu");
                setMobileTicketActive(false);
              }}
              onComplete={(delivery) => {
                toast(`Sales ticket completed — receipt: ${delivery}.`);
                setTicketScreen("menu");
                setMobileTicketActive(false);
              }}
              onMobileSaleStart={() => {
                setMobileTicketActive(true);
                setMobileTicketSection("cart");
              }}
            />
          </CustomerContext.Provider>
        )}
        {view === "Sales Ticket Processing" &&
          ticketScreen === "legacy-entry" && (
            <section className="ticket-workspace">
              <div className="ticket-bar">
                <button onClick={() => setTicketScreen("menu")}>
                  ← Sales Ticket Processing
                </button>
                <span>1 · Sales Ticket Entry</span>
              </div>
              <section className="register">
                <div className="catalog">
                  <div className="search">
                    <Icon name="search" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search products, SKUs, or scan barcode"
                    />
                    <kbd>⌘ K</kbd>
                  </div>
                  <div className="category-tabs">
                    <button className="selected">All products</button>
                    <button>Apparel</button>
                    <button>Accessories</button>
                    <button>Home</button>
                  </div>
                  <div className="product-grid">
                    {productResults.map((product) => (
                      <button
                        className="product-card"
                        key={product.id}
                        onClick={() => addToCart(product)}
                      >
                        <div
                          className={`product-image product-${product.category.toLowerCase()}`}
                        >
                          {product.category === "Apparel"
                            ? "◒"
                            : product.category === "Home"
                              ? "◉"
                              : "▱"}
                          {product.stock <= 5 && (
                            <span>Only {product.stock} left</span>
                          )}
                        </div>
                        <div className="product-info">
                          <small>{product.id}</small>
                          <strong>{product.name}</strong>
                          <div>
                            <b>{money.format(product.price)}</b>
                            <em>
                              {product.stock > 0
                                ? `${product.stock} in stock`
                                : "Out of stock"}
                            </em>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <aside className="cart">
                  <div className="cart-head">
                    <div>
                      <h2>Current sale</h2>
                      <small>Walk-in customer</small>
                    </div>
                    <button className="more">•••</button>
                  </div>
                  <button className="customer-add">+ Add customer</button>
                  <div className="cart-lines">
                    {cart.length === 0 ? (
                      <div className="empty-cart">
                        <span>⌁</span>
                        <p>Your cart is empty</p>
                        <small>Select an item to begin a sale.</small>
                      </div>
                    ) : (
                      cart.map((line) => (
                        <div className="cart-line" key={line.id}>
                          <div className="mini-image">
                            {line.category === "Home" ? "◉" : "◒"}
                          </div>
                          <div className="line-name">
                            <strong>{line.name}</strong>
                            <small>{money.format(line.price)}</small>
                            <div className="quantity">
                              <button onClick={() => adjustCart(line.id, -1)}>
                                −
                              </button>
                              <span>{line.quantity}</span>
                              <button onClick={() => adjustCart(line.id, 1)}>
                                +
                              </button>
                            </div>
                          </div>
                          <b>{money.format(line.price * line.quantity)}</b>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="cart-summary">
                    <div>
                      <span>Subtotal</span>
                      <b>{money.format(subtotal)}</b>
                    </div>
                    <div>
                      <span>Tax</span>
                      <b>{money.format(tax)}</b>
                    </div>
                    <div className="total">
                      <span>Total</span>
                      <b>{money.format(subtotal + tax)}</b>
                    </div>
                    <button className="checkout" onClick={completeSale}>
                      Complete sale <span>{money.format(subtotal + tax)}</span>
                    </button>
                    <p>⌘ ↵ to complete sale</p>
                  </div>
                </aside>
              </section>
            </section>
          )}
        {view === "Sales Ticket Processing" && ticketScreen === "search" && (
          <TicketSearch
            query={ticketQuery}
            setQuery={setTicketQuery}
            onBack={() => setTicketScreen("menu")}
          />
        )}
        {view === "Master Database Management" && (
          <MasterDatabaseMenu
            onSelect={(selection) =>
              setView(
                selection === "customers" ? "Customers" : "Sales Person Master",
              )
            }
          />
        )}
        {view === "Inventory Management" && (
          <InventoryManagementMenu
            onSelect={(selection) =>
              setView(selection === "sku" ? "SKU Maintenance" : "Item Lookup")
            }
          />
        )}
        {view === "SKU Maintenance" && (
          <ResourceView
            title="SKU Maintenance"
            subtitle={`${products.length} products in your catalog`}
            button="Add product"
            rows={products}
            type="product"
            onAdd={() => setModal({ type: "product" })}
            onEdit={(item) => setModal({ type: "product", item })}
            onDelete={(id) => {
              setProducts((p) => p.filter((x) => x.id !== id));
              toast("Product removed.");
            }}
          />
        )}
        {view === "Item Lookup" && <ItemLookup products={products} />}
        {view === "Customers" && (
          <ResourceView
            title="Customers"
            subtitle={`${customers.length} customer profiles`}
            button="Add customer"
            rows={customers}
            type="customer"
            onAdd={() => setModal({ type: "customer" })}
            onEdit={(item) => setModal({ type: "customer", item })}
            onDelete={(id) => {
              setCustomers((c) => c.filter((x) => x.id !== id));
              toast("Customer removed.");
            }}
          />
        )}
        {view === "Sales Person Master" && <SalesPersonMaster />}
        {view === "Settings" && (
          <AppearanceSettings
            appearance={appearance}
            setAppearance={setAppearance}
          />
        )}
        {view === "Dashboard" && <Dashboard />}
        {view === "Sales Analysis & Commissions" && (
          <section className="placeholder">
            <div className="placeholder-icon">◫</div>
            <h2>{view} is ready for the next iteration</h2>
            <p>
              This POC currently focuses on the register, inventory, and
              customer workflows.
            </p>
            <button onClick={() => setView("Register")}>Go to Register</button>
          </section>
        )}
      </main>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {(mobileTicketActive
          ? [
              ["home", "Home", "dashboard"],
              ["cart", "Cart", "sale"],
              ["customer", "Customer", "customers"],
              ["payment", "Payment", "reports"],
            ]
          : [
              ["Dashboard", "Dashboard", "dashboard"],
              ["Sales Ticket Processing", "Sales Tkt", "sale"],
              ["Inventory Management", "Inv.", "inventory"],
              ["Sales Analysis & Commissions", "Comm.", "reports"],
            ]
        ).map(([name, label, icon]) => (
          <button
            key={name}
            className={
              mobileTicketActive
                ? mobileTicketSection === name
                  ? "active"
                  : ""
                : view === name
                  ? "active"
                  : ""
            }
            onClick={() => {
              if (mobileTicketActive) {
                if (name === "home") {
                  setView("Dashboard");
                  setTicketScreen("menu");
                  setMobileTicketActive(false);
                  return;
                }
                setMobileTicketSection(name);
                document
                  .querySelector(`[data-mobile-ticket-section="${name}"]`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
              }
              setView(name);
              if (name === "Sales Ticket Processing")
                setTicketScreen(
                  window.matchMedia("(max-width: 650px)").matches
                    ? "entry"
                    : "menu",
                );
            }}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {mobileTicketActive && (
        <button
          className="mobile-scan-button"
          type="button"
          onPointerDown={() => {
            mobileScanButtonHeld.current = false;
            mobileScanHoldTimer.current = window.setTimeout(() => {
              mobileScanButtonHeld.current = true;
              window.dispatchEvent(new CustomEvent("mobile-product-lookup"));
            }, 550);
          }}
          onPointerUp={() => window.clearTimeout(mobileScanHoldTimer.current)}
          onPointerCancel={() => window.clearTimeout(mobileScanHoldTimer.current)}
          onContextMenu={(event) => event.preventDefault()}
          onClick={() => {
            if (mobileScanButtonHeld.current) {
              mobileScanButtonHeld.current = false;
              return;
            }
            setBarcodeScannerOpen(true);
          }}
          aria-label="Tap to scan a product barcode. Press and hold to search inventory."
          title="Tap to scan · Press and hold to search"
        >
          <BarcodeIcon />
          <span>Hold to search</span>
        </button>
      )}
      {barcodeScannerOpen && (
        <BarcodeScanner
          onClose={() => setBarcodeScannerOpen(false)}
          onScan={(barcode) => {
            window.dispatchEvent(
              new CustomEvent("product-barcode-scanned", { detail: barcode }),
            );
            setBarcodeScannerOpen(false);
          }}
        />
      )}
      {modal && (
        <Modal
          title={`${modal.item ? "Edit" : "Add"} ${modal.type === "product" ? "product" : "customer"}`}
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={modal.type === "product" ? saveProduct : saveCustomer}
          >
            {modal.type === "product" ? (
              <>
                <Field
                  label="Product name"
                  name="name"
                  value={modal.item?.name}
                  record={modal.item}
                  required
                />
                <label>
                  Category
                  <select
                    name="category"
                    defaultValue={modal.item?.category ?? "Apparel"}
                  >
                    <option>Apparel</option>
                    <option>Accessories</option>
                    <option>Home</option>
                  </select>
                </label>
                <div className="form-row">
                  <Field
                    label="Price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={modal.item?.price}
                    required
                  />
                  <Field
                    label="Stock on hand"
                    name="stock"
                    type="number"
                    value={modal.item?.stock}
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <Field
                  label="Customer name"
                  name="name"
                  value={modal.item?.name}
                  required
                />
                <Field
                  label="Email address"
                  name="email"
                  type="email"
                  value={modal.item?.email}
                  required
                />
                <label>
                  Loyalty tier
                  <select
                    name="tier"
                    defaultValue={modal.item?.tier ?? "Member"}
                  >
                    <option>Member</option>
                    <option>Gold</option>
                  </select>
                </label>
              </>
            )}
            <div className="form-actions">
              <button type="button" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="primary" type="submit">
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      )}
      {notice && <div className="toast">✓ {notice}</div>}
      {pendingCommand && (
        <div className="terminal-command" role="status">
          <span>COMMAND</span>
          <kbd>{pendingCommand}</kbd>
          <b>Press Enter to continue</b>
          <small>Esc to cancel</small>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, record, ...props }) {
  if (label === "Customer name") return <CustomerProfileFields />;
  if (label === "Product name")
    return <ProductProfileFields description={value} product={record} />;
  return (
    <label>
      {label}
      <input defaultValue={value} {...props} />
    </label>
  );
}
function CustomerProfileFields() {
  return (
    <>
      <div className="form-row">
        <label>
          First name
          <input name="firstName" required />
        </label>
        <label>
          Last name
          <input name="lastName" required />
        </label>
      </div>
      <label>
        Address
        <input name="address" required />
      </label>
      <div className="form-row">
        <label>
          City
          <input name="city" required />
        </label>
        <label>
          State
          <input name="state" maxLength="2" required />
        </label>
      </div>
      <div className="form-row">
        <label>
          ZIP
          <input name="zip" required />
        </label>
        <label>
          Phone number
          <input name="phone" type="tel" required />
        </label>
      </div>
    </>
  );
}
function ProductProfileFields({ description, product }) {
  const profileRef = useRef(null);
  useEffect(() => {
    const form = profileRef.current?.closest("form");
    if (!form) return;
    form
      .querySelectorAll(
        ':scope > label select[name="category"], :scope > .form-row input[name="price"], :scope > .form-row input[name="stock"]',
      )
      .forEach((input) => {
        input.disabled = true;
      });
  }, []);
  return (
    <div className="product-profile" ref={profileRef}>
      <label>
        Description
        <input name="description" defaultValue={description} required />
      </label>
      <label>
        Product details
        <textarea
          name="productDetails"
          defaultValue={product?.productDetails}
          placeholder="Long description, features, or bullet-style specifications"
          rows="4"
        />
      </label>
      <fieldset className="pc-eligible">
        <legend>Pro Coverage Eligible</legend>
        <label>
          <input
            type="radio"
            name="proCoverageEligible"
            value="true"
            defaultChecked={
              product?.proCoverageEligible ?? product?.pcEligible ?? false
            }
          />
          Yes
        </label>
        <label>
          <input
            type="radio"
            name="proCoverageEligible"
            value="false"
            defaultChecked={
              !(product?.proCoverageEligible ?? product?.pcEligible ?? false)
            }
          />
          No
        </label>
      </fieldset>
      <label>
        Promotional financing
        <select
          name="promotionalFinancingTerm"
          defaultValue={product?.promotionalFinancingTerm ?? 6}
        >
          <option value="6">6 months</option>
          <option value="12">12 months</option>
          <option value="24">24 months</option>
          <option value="36">36 months</option>
          <option value="48">48 months</option>
        </select>
      </label>
      <label>
        Category
        <select name="category" defaultValue={product?.category ?? "Guitars"}>
          <option>Guitars</option>
          <option>Bass</option>
          <option>Keyboards</option>
          <option>Amps</option>
          <option>Drums</option>
          <option>Accessories</option>
          <option>Pro Audio</option>
        </select>
      </label>
      <div className="form-row">
        <label>
          Price
          <input
            name="price"
            type="number"
            step="0.01"
            defaultValue={product?.price}
            required
          />
        </label>
        <label>
          Quantity
          <input
            name="quantity"
            type="number"
            defaultValue={product?.quantity ?? product?.stock}
            required
          />
        </label>
      </div>
      <label>
        Location
        <select
          name="location"
          defaultValue={product?.location ?? "Temple - 499"}
        >
          {skuLocations.map((location) => (
            <option key={location}>{location}</option>
          ))}
        </select>
      </label>
      <label>
        Stock image URL
        <input
          name="thumbnail"
          type="url"
          defaultValue={product?.thumbnail}
          placeholder="/product-placeholder.svg"
        />
      </label>
    </div>
  );
}
function TicketEntry({
  products,
  customers,
  onExit,
  onComplete,
  onMobileSaleStart,
}) {
  const fieldOrder = [
    ["1", "Sales number", "salesNumber"],
    ["2", "Date", "date"],
    ["3", "Taxable", "taxable"],
    ["4", "Sales type", "salesType"],
    ["5", "Status", "status"],
    ["6.01", "Spot number", "spot"],
    ["7.01", "Reference number", "reference"],
    ["8.01", "Salesperson", "salesperson"],
    ["9.01", "Item number", "item"],
    ["9.01", "Quantity", "quantity"],
    ["9.01", "Fulfillment location", "fulfillment"],
    ["9.02", "Item number", "nextItem"],
    ["9.02", "Quantity", "nextQuantity"],
    ["9.02", "Fulfillment location", "nextFulfillment"],
    ["15", "Customer ID", "customerId"],
    ["16", "Customer name", "customerName"],
    ["17", "Email", "email"],
    ["18", "Address", "address"],
    ["19", "ZIP", "zip"],
    ["20", "City", "city"],
    ["21", "State", "state"],
    ["22", "Phone", "phone"],
    ["23", "Resale number", "resale"],
    ["24.01", "Payment type", "paymentType"],
    ["24.01", "Payment amount", "paymentAmount"],
  ];
  const [values, setValues] = useState({
    salesNumber: "New",
    date: "08/12/26",
    taxable: "Yes",
    salesType: "01",
    status: "P",
    spot: "",
    reference: "",
    salesperson: "800027",
    item: "",
    quantity: "",
    fulfillment: "",
    nextItem: "",
    nextQuantity: "",
    nextFulfillment: "",
    customerId: "",
    customerName: "",
    email: "",
    address: "",
    zip: "",
    city: "",
    state: "",
    phone: "",
    resale: "",
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileSaleStarted, setMobileSaleStarted] = useState(false);
  const [fieldJump, setFieldJump] = useState(null);
  const [topCommand, setTopCommand] = useState("");
  const [exitPrompt, setExitPrompt] = useState(false);
  const [financingDetailsOpen, setFinancingDetailsOpen] = useState(false);
  const [applicationLinkSent, setApplicationLinkSent] = useState(false);
  const [receiptDeliveryOpen, setReceiptDeliveryOpen] = useState(false);
  const [receiptDeliveryChoice, setReceiptDeliveryChoice] = useState("");
  const [shippingDetailsOpen, setShippingDetailsOpen] = useState(false);
  const [shippingDeliveryOption, setShippingDeliveryOption] = useState("Ship to Store");
  const [shippingServiceLevel, setShippingServiceLevel] = useState("Ground - Free");
  const [associateLookupOpen, setAssociateLookupOpen] = useState(false);
  const [associateQuery, setAssociateQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedNextItem, setSelectedNextItem] = useState(null);
  const [ticketLines, setTicketLines] = useState([
    { itemNumber: "", product: null, quantity: "", price: "", fulfillment: "" },
  ]);
  const [payments, setPayments] = useState([{ type: "", amount: "" }]);
  const [paymentCodeEntry, setPaymentCodeEntry] = useState(null);
  const [inventorySearch, setInventorySearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState(false);
  const [lookupTarget, setLookupTarget] = useState("item");
  const [itemError, setItemError] = useState("");
  const refs = useRef([]);
  const paymentRefs = useRef([]);
  const completeTicketButtonRef = useRef(null);
  const firstLineItemRef = useRef(null);
  useEffect(() => {
    window.setTimeout(() => refs.current[0]?.focus(), 0);
  }, []);
  const completeWithReceipt = (delivery) => {
    setReceiptDeliveryOpen(false);
    setReceiptDeliveryChoice("");
    onComplete(delivery);
  };
  useEffect(() => {
    if (!receiptDeliveryOpen) return;
    const handleReceiptKey = (event) => {
      const code = event.key.toUpperCase();
      if (["E", "P", "B"].includes(code)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setReceiptDeliveryChoice(code);
        return;
      }
      if (event.key === "Enter" && receiptDeliveryChoice) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const delivery = {
          E: "Email only",
          P: "Print only",
          B: "Email and print",
        }[receiptDeliveryChoice];
        completeWithReceipt(delivery);
      }
    };
    window.addEventListener("keydown", handleReceiptKey, true);
    return () => window.removeEventListener("keydown", handleReceiptKey, true);
  }, [receiptDeliveryOpen, receiptDeliveryChoice]);
  useEffect(() => {
    const handleFieldJump = (event) => {
      if (event.key === "F5") {
        event.preventDefault();
        event.stopPropagation();
        document.activeElement?.blur();
        setFieldJump("");
        return;
      }
      if (fieldJump === null) return;
      if (!/^[0-9.]$/.test(event.key) && event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      if (/^[0-9.]$/.test(event.key)) {
        setFieldJump((current) => current + event.key);
        return;
      }
      if (event.key !== "Enter") return;
      const fieldIndex = fieldOrder.findIndex(
        (field) => field[0] === fieldJump,
      );
      if (fieldJump.startsWith("9."))
        window.dispatchEvent(
          new CustomEvent("ticket-line-jump", { detail: fieldJump }),
        );
      else if (fieldIndex >= 0) {
        setActiveIndex(fieldIndex);
        refs.current[fieldIndex]?.focus();
      }
      setFieldJump(null);
    };
    window.addEventListener("keydown", handleFieldJump, true);
    return () => window.removeEventListener("keydown", handleFieldJump, true);
  }, [fieldJump]);
  useEffect(() => {
    const confirmExit = () => setExitPrompt(true);
    const handleExit = (event) => {
      if (event.key === "F4") {
        event.preventDefault();
        event.stopPropagation();
        confirmExit();
        return;
      }
      if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))
        return;
      const next = `${topCommand}${event.key}`.slice(-3).toUpperCase();
      setTopCommand(next);
      if (next === "TOP") {
        event.preventDefault();
        event.stopPropagation();
        confirmExit();
        setTopCommand("");
      }
    };
    window.addEventListener("keydown", handleExit, true);
    return () => window.removeEventListener("keydown", handleExit, true);
  }, [topCommand, onExit]);
  useEffect(() => {
    const selectCustomer = (event) => {
      const customer = event.detail;
      setValues((current) => ({
        ...current,
        customerId: customer.id,
        customerName: customer.name,
        email: customer.email,
        address: customer.address ?? "",
        city: customer.city ?? "",
        state: customer.state ?? "",
        zip: customer.zip ?? "",
        phone: customer.phone ?? "",
      }));
      const customerIndex = fieldOrder.findIndex(
        (field) => field[2] === "customerId",
      );
      window.setTimeout(() => refs.current[customerIndex]?.focus(), 0);
    };
    window.addEventListener("customer-selected", selectCustomer);
    return () =>
      window.removeEventListener("customer-selected", selectCustomer);
  }, []);
  const active = fieldOrder[activeIndex];
  const moveTo = (index) => {
    const next = Math.max(0, Math.min(fieldOrder.length - 1, index));
    setActiveIndex(next);
    window.setTimeout(() => refs.current[next]?.focus(), 0);
  };
  const skippedByDefault = new Set(["date", "taxable", "status", "spot"]);
  const navigationOrder = fieldOrder
    .map((field, index) => (skippedByDefault.has(field[2]) ? null : index))
    .filter((index) => index !== null);
  const moveByKeyboard = (index, direction) => {
    const candidates =
      direction > 0
        ? navigationOrder.filter((item) => item > index)
        : navigationOrder.filter((item) => item < index);
    moveTo(
      direction > 0
        ? (candidates[0] ?? navigationOrder.at(-1))
        : (candidates.at(-1) ?? navigationOrder[0]),
    );
  };
  const selectItem = (item, target = lookupTarget) => {
    if (target === "nextItem") {
      setSelectedNextItem(item);
      setValues((current) => ({
        ...current,
        nextItem: item.itemNumber,
        nextQuantity: "1",
        nextFulfillment: fulfillmentLabel(item.location),
      }));
    } else {
      setSelectedItem(item);
      setValues((current) => ({
        ...current,
        item: item.itemNumber,
        quantity: "1",
        fulfillment: fulfillmentLabel(item.location),
      }));
    }
    setItemError("");
    setInventorySearch(false);
  };
  const onKeyDown = (event, index, key) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (key === "salesType" && !values.salesType)
        setValues((current) => ({ ...current, salesType: "01" }));
      if (key === "salesperson") {
        const itemIndex = fieldOrder.findIndex((field) => field[2] === "item");
        setActiveIndex(itemIndex);
        window.setTimeout(() => firstLineItemRef.current?.focus(), 0);
        return;
      }
      if (key === "fulfillment" && selectedItem)
        event.currentTarget
          .closest(".ticket-entry")
          ?.classList.add("next-line-ready");
      if (key === "customerId") {
        if (values.customerId === ".") {
          window.dispatchEvent(new Event("customer-lookup"));
          return;
        }
        const customer = customers.find(
          (candidate) => candidate.id === values.customerId,
        );
        if (customer)
          setValues((current) => ({
            ...current,
            customerName: customer.name,
            email: customer.email,
            phone: customer.phone ?? current.phone,
          }));
      }
      if (key === "item" || key === "nextItem") {
        const value = values[key];
        if (!value.trim()) {
          const customerIndex = fieldOrder.findIndex(
            (field) => field[2] === "customerId",
          );
          moveTo(customerIndex);
          return;
        }
        if (value === ".") {
          setLookupTarget(key);
          setInventorySearch(true);
          return;
        }
        const item = products.find((product) => product.itemNumber === value);
        if (!item) {
          setItemError(
            "Enter a valid 10-digit item number, or . then Enter to search inventory.",
          );
          return;
        }
        selectItem(item, key);
      }
      moveByKeyboard(index, 1);
    }
    if (event.key === "F6") {
      event.preventDefault();
      moveByKeyboard(index, -1);
    }
  };
  const input = (key, options = {}) => {
    const index = fieldOrder.findIndex((field) => field[2] === key);
    const [number, label] = fieldOrder[index];
    const shared = {
      ref: (element) => {
        refs.current[index] = element;
      },
      value: values[key],
      onFocus: (event) => {
        setActiveIndex(index);
        event.currentTarget.select?.();
      },
      onClick: () => setActiveIndex(index),
      onBlur: (event) => {
        if (key === "fulfillment" && selectedItem)
          event.currentTarget
            .closest(".ticket-entry")
            ?.classList.add("next-line-ready");
      },
      onKeyDown: (event) => onKeyDown(event, index, key),
      onChange: (event) =>
        setValues((current) => ({ ...current, [key]: event.target.value })),
    };
    const nextItemIndex = fieldOrder.findIndex(
      (field) => field[2] === "nextItem",
    );
    const nextItemInput = {
      ref: (element) => {
        refs.current[nextItemIndex] = element;
      },
      value: values.nextItem,
      onFocus: () => setActiveIndex(nextItemIndex),
      onClick: () => setActiveIndex(nextItemIndex),
      onKeyDown: (event) => onKeyDown(event, nextItemIndex, "nextItem"),
      onChange: (event) =>
        setValues((current) => ({ ...current, nextItem: event.target.value })),
    };
    const nextField = (keyName) => {
      const nextIndex = fieldOrder.findIndex((field) => field[2] === keyName);
      return {
        ref: (element) => {
          refs.current[nextIndex] = element;
        },
        value: values[keyName],
        onFocus: () => setActiveIndex(nextIndex),
        onClick: () => setActiveIndex(nextIndex),
        onKeyDown: (event) => onKeyDown(event, nextIndex, keyName),
        onChange: (event) =>
          setValues((current) => ({
            ...current,
            [keyName]: event.target.value,
          })),
      };
    };
    return (
      <label
        className={`ticket-field ${activeIndex === index ? "focused" : ""}`}
      >
        <span>
          <b>{number}</b>
          {label}
        </span>
        {options.select ? (
          <select {...shared}>
            {options.select.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        ) : (
          <input {...shared} {...options} />
        )}{" "}
        {key === "salesType" && activeIndex === index && (
          <div className="sales-type-popup">
            <p>
              Sales type <small>Enter selects 01</small>
            </p>
            {[
              ["01", "Regular Sale"],
              ["03", "Refund of Deposit"],
              ["11", "Return"],
              ["70", "Create COA"],
            ].map(([code, title]) => (
              <button
                key={code}
                type="button"
                className={values.salesType === code ? "selected" : ""}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setValues((current) => ({ ...current, salesType: code }));
                  refs.current[index]?.focus();
                }}
              >
                <b>{code}</b>
                <span>{title}</span>
              </button>
            ))}
          </div>
        )}
        {key === "fulfillment" && selectedItem && (
          <div className="next-item-row">
            <label
              className={`next-item-field ${activeIndex === nextItemIndex ? "focused" : ""}`}
            >
              <span>
                <b>9.02</b>Item number
              </span>
              <input
                {...nextItemInput}
                maxLength="10"
                placeholder="Item #, or Enter to continue"
              />
            </label>
            <div className="next-item-description">
              {selectedNextItem ? (
                <>
                  <img src={selectedNextItem.thumbnail} alt="" />
                  <div>
                    <span>DESCRIPTION</span>
                    <strong>{selectedNextItem.name}</strong>
                    <small>{selectedNextItem.stock} available</small>
                  </div>
                </>
              ) : (
                <span>Item details appear after lookup</span>
              )}
            </div>
            <label className="next-item-field">
              <span>
                <b>9.02</b>Quantity
              </span>
              <input {...nextField("nextQuantity")} />
            </label>
            <label className="next-item-field">
              <span>
                <b>9.02</b>Fulfillment
              </span>
              <select {...nextField("nextFulfillment")}>
                {fulfillmentOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </label>
    );
  };
  const fulfillmentOptions = skuLocations.map(fulfillmentLabel);
  const saleTotal = ticketLines.reduce(
    (total, line) =>
      total +
      Number(line.price || 0) * Number(line.quantity || 0) +
      Number(line.coverage?.price || 0),
    0,
  );
  const remoteFulfillmentLines = ticketLines.filter(
    (line) =>
      line.product && line.fulfillment && line.fulfillment !== "In-store",
  );
  const hasTicketItems = ticketLines.some((line) => line.product);
  const creditedAssociate =
    salesAssociates.find(
      (associate) => associate.employeeNumber === values.salesperson,
    ) ?? salesAssociates[0];
  const associateMatches = salesAssociates.filter((associate) =>
    `${associate.name} ${associate.email} ${associate.employeeNumber}`
      .toLowerCase()
      .includes(associateQuery.toLowerCase()),
  );
  const shippingRates = {
    "Ground - Free": 0,
    "2nd-Day Express - $29.99": 29.99,
    "Next Day Air - $59.99": 59.99,
  };
  const shippingCharge = remoteFulfillmentLines.length
    ? shippingRates[shippingServiceLevel]
    : 0;
  const taxRate = 0.0725;
  const salesTax = values.taxable === "Yes" ? saleTotal * taxRate : 0;
  const grandTotal = saleTotal + salesTax + shippingCharge;
  const paymentTypes = [
    "C -Card",
    "01 - Cash",
    "02 - Check",
    "12 - COA",
    "19 - Change Due",
  ];
  const longestFinancingTerm = ticketLines.reduce(
    (longestTerm, line) =>
      line.product
        ? Math.max(
            longestTerm,
            Number(line.product.promotionalFinancingTerm ?? 6),
          )
        : longestTerm,
    0,
  );
  const potentialRewards = saleTotal * 0.05;
  const appliedPaymentTotal = payments
    .filter((payment) => payment.type && !payment.isChangeDue)
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const paymentComplete =
    grandTotal > 0 && appliedPaymentTotal >= grandTotal - 0.005;
  const monthlyPayment = longestFinancingTerm
    ? grandTotal / longestFinancingTerm
    : null;
  const updatePayment = (index, field, value) => {
    setPayments((current) => {
      const selectedPayment = current[index];
      const enteredPayments = current.filter(
        (payment) => !payment.isChangeDue && !payment.isRemainder,
      );
      const targetIndex = selectedPayment?.isRemainder
        ? enteredPayments.length
        : index;
      if (selectedPayment?.isRemainder)
        enteredPayments.push({ type: "", amount: selectedPayment.amount });

      const balanceBeforePayment = enteredPayments
        .slice(0, targetIndex)
        .reduce(
          (balance, payment) =>
            payment.type ? balance - Number(payment.amount || 0) : balance,
          grandTotal,
        );
      const next = enteredPayments.map((payment, paymentIndex) =>
        paymentIndex === targetIndex
          ? {
              ...payment,
              [field]: value,
              ...(field === "type" && value && !payment.amount
                ? { amount: Math.max(balanceBeforePayment, 0).toFixed(2) }
                : {}),
            }
          : payment,
      );

      let remainingBalance = grandTotal;
      let changeDue = 0;
      for (const payment of next) {
        if (!payment.type) continue;
        const amount = Number(payment.amount || 0);
        if (payment.type === "01 - Cash" && amount > remainingBalance) {
          changeDue = amount - remainingBalance;
          remainingBalance = 0;
          break;
        }
        remainingBalance -= amount;
      }

      if (changeDue > 0)
        return [
          ...next,
          {
            type: "19 - Change Due",
            amount: changeDue.toFixed(2),
            isChangeDue: true,
          },
        ];
      if (remainingBalance > 0 && next.some((payment) => payment.type))
        return [
          ...next,
          {
            type: "",
            amount: remainingBalance.toFixed(2),
            isRemainder: true,
          },
        ];
      return next;
    });
  };
  const paymentTypeFromCode = (code) => {
    const normalizedCode = code.toUpperCase();
    return (
      paymentTypes.find(
        (type) => type.split(" -")[0].toUpperCase() === normalizedCode,
      ) ??
      ({ "1": "01 - Cash", "2": "02 - Check" }[normalizedCode] ?? null)
    );
  };
  return (
    <section
      className={`ticket-entry ${mobileSaleStarted ? "mobile-ticket-started" : "mobile-ticket-choice"}`}
    >
      <section className="mobile-sale-start">
        <p className="eyebrow">SALES TICKET</p>
        <h2>What would you like to process?</h2>
        <div className="mobile-sale-choices">
          <button
            type="button"
            onClick={() => {
              setValues((current) => ({ ...current, salesType: "01" }));
              setMobileSaleStarted(true);
              onMobileSaleStart();
            }}
          >
            <span>+</span>
            <strong>Regular Sale</strong>
            <small>Start a new sales ticket</small>
          </button>
          <button
            type="button"
            onClick={() => {
              setValues((current) => ({ ...current, salesType: "11" }));
              setMobileSaleStarted(true);
              onMobileSaleStart();
            }}
          >
            <span>↩</span>
            <strong>Return</strong>
            <small>Process a customer return</small>
          </button>
        </div>
      </section>
      <div className="ticket-bar">
        <span>F4 or TOP to exit ticket</span>
        <span>1 · Sales Ticket Entry</span>
      </div>
      <div className="ticket-entry-head">
        <div>
          <p className="eyebrow">SALES TICKET ENTRY</p>
          <h2>Create and process a sales ticket</h2>
        </div>
        <div className="ticket-focus-readout">
          <span>ACTIVE FIELD</span>
          <b>{active[0]}</b>
          <strong>{active[1]}</strong>
          <small>Enter next · F6 previous</small>
        </div>
      </div>
      {fieldJump !== null && (
        <div className="field-jump-readout">FIELD JUMP: {fieldJump || "_"}</div>
      )}
      <div className="ticket-top-fields">
        {input("salesNumber")}
        {input("date")}
        {input("taxable", { select: ["Yes", "No"] })}
        {input("salesType")}
        {input("status")}
        {input("spot")}
        {input("reference")}
        {input("salesperson")}
      </div>
      <div data-mobile-ticket-section="cart">
        <div className="mobile-associate-header">
          <div>
            <span>Associate credit</span>
            <strong>{creditedAssociate.name}</strong>
          </div>
          <button type="button" onClick={() => setAssociateLookupOpen(true)}>
            Reassign
          </button>
        </div>
        <TicketLineItems
          products={products}
          lines={ticketLines}
          onChange={setTicketLines}
          firstItemInputRef={firstLineItemRef}
          onFirstItemFocus={() =>
            setActiveIndex(fieldOrder.findIndex((field) => field[2] === "item"))
          }
          onReturnToSalesperson={() => {
            const salespersonIndex = fieldOrder.findIndex(
              (field) => field[2] === "salesperson",
            );
            setActiveIndex(salespersonIndex);
            refs.current[salespersonIndex]?.focus();
          }}
          onProceedToCustomer={() => {
            const customerIndex = fieldOrder.findIndex(
              (field) => field[2] === "customerId",
            );
            setActiveIndex(customerIndex);
            refs.current[customerIndex]?.focus();
          }}
        />
      </div>
      <div className="ticket-lower">
        <section className="customer-panel panel" data-mobile-ticket-section="customer">
          <div className="panel-title">
            <div>
              <p className="eyebrow">CUSTOMER INFORMATION</p>
              <button
                className="customer-search-button"
                type="button"
                onClick={() =>
                  window.dispatchEvent(new Event("customer-lookup"))
                }
              >
                <Icon name="search" /> Search customer
              </button>
            </div>
            {remoteFulfillmentLines.length > 0 && (
              <button
                className="customer-search-button"
                type="button"
                onClick={() => setShippingDetailsOpen(true)}
              >
                Shipping Details
              </button>
            )}
          </div>
          <div className="customer-grid">
            {input("customerId")}
            {input("customerName")}
            {input("email", { type: "email" })}
            {input("address")} {input("zip")}
            {input("city")}
            {input("state")}
            {input("phone", { type: "tel" })}
            {input("resale")}
          </div>
        </section>
        <aside className="ticket-totals panel">
          <p className="eyebrow">TOTALS</p>
          <button
            className="financing-details-button"
            type="button"
            onClick={() => setFinancingDetailsOpen(true)}
            disabled={!hasTicketItems}
          >
            Financing Details
          </button>
          <div>
            <span>11 · Sale amount</span>
            <b>{money.format(saleTotal)}</b>
          </div>
          <div>
            <span>12 · Subtotal</span>
            <b>{money.format(saleTotal)}</b>
          </div>
          <div>
            <span>13 · Tax (7.25%)</span>
            <b>{money.format(salesTax)}</b>
          </div>
          <div>
            <span>13.5 · Shipping</span>
            <b>{money.format(shippingCharge)}</b>
          </div>
          <div className="grand-total">
            <span>14 · Total</span>
            <b>{money.format(grandTotal)}</b>
          </div>
        </aside>
      </div>
      <section className="payment-panel panel" data-mobile-ticket-section="payment">
        <div className="panel-title">
          <div>
            <p className="eyebrow">PAYMENTS</p>
          </div>
        </div>
        <div className="payment-entry-layout">
          <div className="payment-fields">
            {payments.map((payment, index) => {
            const paymentFieldIndex = fieldOrder.findIndex(
              (field) => field[2] === "paymentType",
            );
            const amountFieldIndex = fieldOrder.findIndex(
              (field) => field[2] === "paymentAmount",
            );
            const lineNumber = `24.${String(index + 1).padStart(2, "0")}`;
            return (
              <div className="payment-line" key={payment.isChangeDue ? "change" : index}>
                <b>{lineNumber}</b>
                <label
                  className={`ticket-field payment-field ${activeIndex === paymentFieldIndex ? "focused" : ""}`}
                >
                  <span>Type</span>
                  <input
                    ref={(element) => {
                      paymentRefs.current[index] ??= {};
                      paymentRefs.current[index].type = element;
                      if (index === 0) refs.current[paymentFieldIndex] = element;
                    }}
                    value={
                      paymentCodeEntry?.index === index
                        ? paymentCodeEntry.code
                        : payment.type
                    }
                    disabled={payment.isChangeDue}
                    readOnly
                    placeholder="Select payment type"
                    onFocus={() => setActiveIndex(paymentFieldIndex)}
                    onKeyDown={(event) => {
                      if (/^[a-zA-Z0-9]$/.test(event.key)) {
                        event.preventDefault();
                        setPaymentCodeEntry((current) => ({
                          index,
                          code:
                            current?.index === index
                              ? `${current.code}${event.key}`.slice(-2)
                              : event.key,
                        }));
                        return;
                      }
                      if (event.key === "Backspace") {
                        event.preventDefault();
                        setPaymentCodeEntry((current) =>
                          current?.index === index
                            ? { ...current, code: current.code.slice(0, -1) }
                            : current,
                        );
                        return;
                      }
                      if (
                        event.key === "Enter" &&
                        paymentCodeEntry?.index === index
                      ) {
                        const selectedType = paymentTypeFromCode(
                          paymentCodeEntry.code,
                        );
                        if (selectedType) {
                          event.preventDefault();
                          updatePayment(index, "type", selectedType);
                          setPaymentCodeEntry(null);
                          return;
                        }
                      }
                      setPaymentCodeEntry(null);
                      onKeyDown(event, paymentFieldIndex, "paymentType");
                    }}
                  />
                  {activeIndex === paymentFieldIndex &&
                    !payment.isChangeDue && (
                      <div className="payment-type-popup">
                        <p>Payment type</p>
                        {paymentTypes.map((type) => {
                          const [code, title] = type.split(" -");
                          return (
                            <button
                              key={type}
                              type="button"
                              className={payment.type === type ? "selected" : ""}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                updatePayment(index, "type", type);
                                setPaymentCodeEntry(null);
                                paymentRefs.current[index]?.type?.focus();
                              }}
                            >
                              <b>{code}</b>
                              <span>{title}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                </label>
                <label
                  className={`ticket-field payment-field ${activeIndex === amountFieldIndex ? "focused" : ""}`}
                >
                  <span>Amount</span>
                  <input
                    ref={(element) => {
                      paymentRefs.current[index] ??= {};
                      paymentRefs.current[index].amount = element;
                      if (index === 0) refs.current[amountFieldIndex] = element;
                    }}
                    value={payment.amount}
                    readOnly={payment.isChangeDue}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    onFocus={(event) => {
                      setActiveIndex(amountFieldIndex);
                      event.currentTarget.select();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (paymentComplete) {
                          completeTicketButtonRef.current?.focus();
                          return;
                        }
                        const remainderIndex = payments.findIndex(
                          (candidate) => candidate.isRemainder,
                        );
                        if (remainderIndex >= 0) {
                          paymentRefs.current[remainderIndex]?.type?.focus();
                          return;
                        }
                      }
                      onKeyDown(event, amountFieldIndex, "paymentAmount");
                    }}
                    onChange={(event) =>
                      updatePayment(index, "amount", event.target.value)
                    }
                  />
                </label>
              </div>
            );
            })}
          </div>
          <button
            ref={completeTicketButtonRef}
            className="complete-ticket-button"
            type="button"
            disabled={!paymentComplete}
            onClick={() => setReceiptDeliveryOpen(true)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              event.stopPropagation();
              event.nativeEvent.stopImmediatePropagation();
              setReceiptDeliveryOpen(true);
            }}
          >
            Complete Ticket
          </button>
        </div>
      </section>
      {inventorySearch && (
        <InventoryLookup
          products={products}
          onSelect={(item) => {
            selectItem(item);
            const itemIndex = fieldOrder.findIndex(
              (field) => field[2] === "item",
            );
            moveByKeyboard(itemIndex, 1);
          }}
          onClose={() => setInventorySearch(false)}
        />
      )}
      {exitPrompt && (
        <Modal title="Exit sales ticket?" onClose={() => setExitPrompt(false)}>
          <p className="exit-ticket-message">
            Unsaved ticket data will be lost.
          </p>
          <div className="form-actions">
            <button type="button" onClick={() => setExitPrompt(false)}>
              Continue ticket
            </button>
            <button className="primary" type="button" onClick={onExit}>
              Exit ticket
            </button>
          </div>
        </Modal>
      )}
      {financingDetailsOpen && (
        <Modal
          title="Financing Details"
          onClose={() => setFinancingDetailsOpen(false)}
        >
          <div className="financing-details-summary">
            <div>
              <span>Longest eligible term</span>
              <strong>
                {longestFinancingTerm
                  ? `${longestFinancingTerm} months`
                  : "No items on ticket"}
              </strong>
            </div>
            <div>
              <span>Potential rewards</span>
              <strong>{money.format(potentialRewards)}</strong>
              <small>5% of {money.format(saleTotal)} subtotal</small>
            </div>
            <div>
              <span>Estimated monthly payment</span>
              <strong>
                {monthlyPayment === null ? "—" : money.format(monthlyPayment)}
              </strong>
              <small>
                Post-tax total of {money.format(grandTotal)} over{" "}
                {longestFinancingTerm || "—"} months
              </small>
            </div>
          </div>
          <button
            className="primary send-application-link"
            type="button"
            onClick={() => setApplicationLinkSent(true)}
          >
            Send Application Link
          </button>
          <div className="form-actions">
            <button
              className="primary"
              type="button"
              onClick={() => setFinancingDetailsOpen(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
      {applicationLinkSent && (
        <Modal
          title="Application Link Sent"
          onClose={() => {
            setApplicationLinkSent(false);
            setFinancingDetailsOpen(false);
          }}
        >
          <p className="exit-ticket-message">
            Link successfully sent.
          </p>
          <div className="form-actions">
            <button
              className="primary"
              type="button"
              onClick={() => {
                setApplicationLinkSent(false);
                setFinancingDetailsOpen(false);
              }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
      {receiptDeliveryOpen && (
        <Modal
          title="Deliver receipt"
          onClose={() => {
            setReceiptDeliveryOpen(false);
            setReceiptDeliveryChoice("");
          }}
        >
          <p className="receipt-delivery-message">
            Choose how the customer should receive their receipt.
          </p>
          <div className="receipt-delivery-options">
            {[
              ["E", "Email only", "✉"],
              ["P", "Print only", "▤"],
              ["B", "Both", "✉ + ▤"],
            ].map(([code, label, icon]) => (
              <button
                key={code}
                type="button"
                className={receiptDeliveryChoice === code ? "selected" : ""}
                onClick={() =>
                  completeWithReceipt(
                    { E: "Email only", P: "Print only", B: "Email and print" }[
                      code
                    ],
                  )
                }
              >
                <span className="receipt-icon">{icon}</span>
                <strong>{label}</strong>
                <kbd>{code}</kbd>
              </button>
            ))}
          </div>
          <small className="receipt-key-hint">
            Enter E, P, or B, then press Enter.
          </small>
        </Modal>
      )}
      {shippingDetailsOpen && (
        <Modal
          title="Shipping Details"
          onClose={() => setShippingDetailsOpen(false)}
        >
          <div className="shipping-details-list">
            {remoteFulfillmentLines.map((line, index) => (
              <div key={`${line.itemNumber}-${index}`}>
                <strong>{line.product.name}</strong>
                <span>{line.fulfillment}</span>
              </div>
            ))}
          </div>
          <div className="shipping-choice-group">
            <span>Delivery option</span>
            <div className="shipping-choice-options">
              {["Ship to Store", "Ship to Customer"].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={shippingDeliveryOption === option ? "selected" : ""}
                  onClick={() => setShippingDeliveryOption(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="shipping-choice-group">
            <span>Service level</span>
            <div className="shipping-choice-options shipping-service-options">
              {[
                "Ground - Free",
                "2nd-Day Express - $29.99",
                "Next Day Air - $59.99",
              ].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={shippingServiceLevel === option ? "selected" : ""}
                  onClick={() => setShippingServiceLevel(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button
              className="primary"
              type="button"
              onClick={() => setShippingDetailsOpen(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
      {associateLookupOpen && (
        <Modal
          title="Reassign associate"
          onClose={() => {
            setAssociateLookupOpen(false);
            setAssociateQuery("");
          }}
        >
          <div className="lookup-search">
            <Icon name="search" />
            <input
              autoFocus
              value={associateQuery}
              onChange={(event) => setAssociateQuery(event.target.value)}
              placeholder="Name, email, or employee number"
            />
          </div>
          <div className="lookup-results associate-lookup-results">
            {associateMatches.map((associate) => (
              <button
                key={associate.employeeNumber}
                type="button"
                onClick={() => {
                  setValues((current) => ({
                    ...current,
                    salesperson: associate.employeeNumber,
                  }));
                  setAssociateLookupOpen(false);
                  setAssociateQuery("");
                }}
              >
                <div>
                  <strong>{associate.name}</strong>
                  <span>{associate.email}</span>
                  <small>Employee #{associate.employeeNumber}</small>
                </div>
              </button>
            ))}
            {!associateMatches.length && <p>No associates match your search.</p>}
          </div>
        </Modal>
      )}
    </section>
  );
}
function TicketLineItems({
  products,
  lines,
  onChange,
  firstItemInputRef,
  onFirstItemFocus,
  onReturnToSalesperson,
  onProceedToCustomer,
}) {
  const fulfillmentOptions = skuLocations.map(fulfillmentLabel);
  const customers = useContext(CustomerContext);
  const [lookupLine, setLookupLine] = useState(null);
  const [customerLookup, setCustomerLookup] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [coverageLine, setCoverageLine] = useState(null);
  const [coverageAdvance, setCoverageAdvance] = useState(false);
  const [addOnLine, setAddOnLine] = useState(null);
  const [imageProduct, setImageProduct] = useState(null);
  const [actionLine, setActionLine] = useState(null);
  useEffect(() => {
    const addScannedProduct = (event) => {
      const barcode = String(event.detail ?? "").trim();
      const product = products.find(
        (candidate) =>
          candidate.itemNumber === barcode || candidate.id === barcode,
      );
      if (!product) return;
      onChange((current) => {
        const nextLine = {
          itemNumber: product.itemNumber,
          product,
          quantity: "1",
          price: String(product.price),
          coverage: null,
          fulfillment: fulfillmentLabel(product.location),
        };
        const availableIndex = current.findIndex((line) => !line.product);
        return availableIndex >= 0
          ? current.map((line, index) =>
              index === availableIndex ? nextLine : line,
            )
          : [...current, nextLine];
      });
    };
    window.addEventListener("product-barcode-scanned", addScannedProduct);
    return () =>
      window.removeEventListener("product-barcode-scanned", addScannedProduct);
  }, [products, onChange]);
  useEffect(() => {
    const openMobileProductLookup = () => {
      const availableIndex = lines.findIndex((line) => !line.product);
      if (availableIndex >= 0) {
        setLookupLine(availableIndex);
        return;
      }
      setLookupLine(lines.length);
      onChange((current) => [
        ...current,
        {
          itemNumber: "",
          product: null,
          quantity: "",
          price: "",
          coverage: null,
          fulfillment: "",
        },
      ]);
    };
    window.addEventListener("mobile-product-lookup", openMobileProductLookup);
    return () =>
      window.removeEventListener(
        "mobile-product-lookup",
        openMobileProductLookup,
      );
  }, [lines, onChange]);
  const selectFieldText = (event) => event.currentTarget.select?.();
  const lineRefs = useRef([]);
  const isCoverageEligible = (line) =>
    line.product?.proCoverageEligible ?? line.product?.pcEligible ?? false;
  useEffect(() => {
    const openLookup = () => setCustomerLookup(true);
    window.addEventListener("customer-lookup", openLookup);
    return () => window.removeEventListener("customer-lookup", openLookup);
  }, []);
  useEffect(() => {
    const jumpToLine = (event) => {
      const lineIndex = Number(event.detail.split(".")[1]) - 1;
      if (!Number.isInteger(lineIndex) || lineIndex < 0) return;
      if (lineIndex >= lines.length)
        onChange((current) => [
          ...current,
          ...Array.from({ length: lineIndex - current.length + 1 }, () => ({
            itemNumber: "",
            product: null,
            quantity: "",
            price: "",
            coverage: null,
            fulfillment: "",
          })),
        ]);
      focusLineField(lineIndex, "itemNumber");
    };
    window.addEventListener("ticket-line-jump", jumpToLine);
    return () => window.removeEventListener("ticket-line-jump", jumpToLine);
  }, [lines, onChange]);
  const focusLineField = (lineIndex, field) =>
    window.setTimeout(() => lineRefs.current[lineIndex]?.[field]?.focus(), 0);
  const update = (index, key, value) =>
    onChange((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? key === "itemNumber"
            ? {
                ...line,
                itemNumber: value,
                product: null,
                quantity: "",
                price: "",
                coverage: null,
                fulfillment: "",
              }
            : { ...line, [key]: value }
          : line,
      ),
    );
  const completeLine = (event, index) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const line = lines[index];
    if (!line.itemNumber.trim()) return onProceedToCustomer();
    if (line.itemNumber === ".") {
      setLookupLine(index);
      return;
    }
    const product = products.find(
      (candidate) => candidate.itemNumber === line.itemNumber,
    );
    if (!product) return;
    onChange((current) =>
      current.map((candidate, lineIndex) =>
        lineIndex === index
          ? {
              ...candidate,
              product,
              quantity: candidate.quantity || "1",
              price: candidate.price || String(product.price),
              fulfillment:
                candidate.fulfillment || fulfillmentLabel(product.location),
            }
          : candidate,
      ),
    );
    focusLineField(index, "quantity");
  };
  const selectLookupItem = (product) => {
    onChange((current) =>
      current.map((line, index) =>
        index === lookupLine
          ? {
              ...line,
              itemNumber: product.itemNumber,
              product,
              quantity: line.quantity || "1",
              price: line.price || String(product.price),
              fulfillment: line.fulfillment || fulfillmentLabel(product.location),
            }
          : line,
      ),
    );
    setLookupLine(null);
    focusLineField(lookupLine, "itemNumber");
  };
  const addLine = () => {
    const nextIndex = lines.length;
    onChange((current) => [
      ...current,
      {
        itemNumber: "",
        product: null,
        quantity: "",
        price: "",
        coverage: null,
        fulfillment: "",
      },
    ]);
    focusLineField(nextIndex, "itemNumber");
  };
  const navigateLine = (event, index, field) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (field === "quantity") return focusLineField(index, "price");
      if (field === "price") return focusLineField(index, "fulfillment");
      if (
        field === "fulfillment" &&
        isCoverageEligible(lines[index]) &&
        !lines[index].coverage
      ) {
        setCoverageAdvance(true);
        setCoverageLine(index);
        return;
      }
      if (field === "fulfillment")
        return index < lines.length - 1
          ? focusLineField(index + 1, "itemNumber")
          : addLine();
    }
    if (event.key === "F6") {
      event.preventDefault();
      if (field === "quantity") return focusLineField(index, "itemNumber");
      if (field === "fulfillment") return focusLineField(index, "price");
      if (field === "price") return focusLineField(index, "quantity");
      if (index > 0) return focusLineField(index - 1, "fulfillment");
      onReturnToSalesperson();
    }
  };
  return (
    <section className="ticket-items panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">LINE ITEMS</p>
          <h3>Items on this ticket</h3>
        </div>
        <span>Enter an item number, or . then Enter to search inventory</span>
      </div>
      {lines.map((line, index) => (
        <div
          className={`dynamic-line ${line.product ? "" : "empty-mobile-line"}`}
          key={index}
        >
          <b>{`9.${String(index + 1).padStart(2, "0")}`}</b>
          <div className="item-number-control">
            <input
              ref={(element) => {
                lineRefs.current[index] ??= {};
                lineRefs.current[index].itemNumber = element;
                if (index === 0) firstItemInputRef.current = element;
              }}
              value={line.itemNumber}
              onFocus={(event) => {
                selectFieldText(event);
                if (index === 0) onFirstItemFocus();
              }}
              onChange={(event) =>
                update(index, "itemNumber", event.target.value)
              }
              onKeyDown={(event) =>
                event.key === "F6"
                  ? navigateLine(event, index, "itemNumber")
                  : completeLine(event, index)
              }
              placeholder="Item number or ."
              maxLength="10"
              aria-label={`Item number for line 9.${String(index + 1).padStart(2, "0")}`}
            />
            {!line.product && (
              <button
                className="item-search-button"
                type="button"
                onClick={() => setLookupLine(index)}
                aria-label="Search inventory"
              >
                <Icon name="search" />
              </button>
            )}
          </div>
          <div className="line-description-area">
            {line.product && (
              <button
                className="ticket-thumbnail-button"
                type="button"
                onClick={() => {
                  setActionLine(index);
                  setImageProduct(line.product);
                }}
                aria-label={`View larger image of ${line.product.name}`}
              >
                <img src={line.product.thumbnail} alt="" />
              </button>
            )}
            {!line.product && <span className="line-action-placeholder" />}
            <span className="item-description-text">
              {line.product?.name ?? "Description appears after lookup"}
            </span>
            <div className="line-action-group">
              {line.product?.productDetails && (
                <button
                  className="item-details-button"
                  type="button"
                  onClick={() => {
                    setActionLine(index);
                    setDetailsProduct(line.product);
                  }}
                  aria-label={`View details for ${line.product.name}`}
                >
                  i
                </button>
              )}
              {!line.product?.productDetails && (
                <span className="line-action-placeholder details-slot" />
              )}
              {line.product && (
                <span
                  className="financing-indicator"
                  title="Promotional financing available"
                >
                  <i aria-hidden="true">
                    <span>{line.product.promotionalFinancingTerm ?? 6} mo</span>
                  </i>
                </span>
              )}
              {!line.product && (
                <span className="line-action-placeholder financing-slot" />
              )}
              {line.product &&
                (isCoverageEligible(line) ? (
                  <button
                    className={`coverage-button ${line.coverage ? "selected" : ""}`}
                    type="button"
                    onClick={() => {
                      setCoverageAdvance(false);
                      setCoverageLine(index);
                    }}
                    aria-label={`Add Pro Coverage for ${line.product.name}`}
                  >
                    ⛨{line.coverage && <small>{line.coverage.label}</small>}
                  </button>
                ) : (
                  <span
                    className="coverage-ineligible"
                    title="Not eligible for Pro Coverage"
                    aria-label="Not eligible for Pro Coverage"
                  >
                    ⛨
                  </span>
                ))}
              {!line.product && (
                <span className="line-action-placeholder coverage-slot" />
              )}
              {line.product && line.product.category !== "Accessories" && (
                <button
                  className="add-on-button"
                  type="button"
                  onClick={() => {
                    setActionLine(index);
                    setAddOnLine(index);
                  }}
                  aria-label={`View suggested add-ons for ${line.product.name}`}
                >
                  +
                </button>
              )}
              {(!line.product || line.product.category === "Accessories") && (
                <span className="line-action-placeholder add-on-slot" />
              )}
              {line.fulfillment && line.fulfillment !== "In-store" ? (
                <span
                  className="delivery-indicator"
                  title={`Delivery from ${line.fulfillment}`}
                  aria-label={`Delivery from ${line.fulfillment}`}
                >
                  <DeliveryTruckIcon />
                </span>
              ) : (
                <span className="line-action-placeholder delivery-slot" />
              )}
            </div>
          </div>
          <input
            ref={(element) => {
              lineRefs.current[index] ??= {};
              lineRefs.current[index].quantity = element;
            }}
            value={line.quantity}
            onFocus={selectFieldText}
            onChange={(event) => update(index, "quantity", event.target.value)}
            onKeyDown={(event) => navigateLine(event, index, "quantity")}
            placeholder="Qty"
            inputMode="numeric"
            aria-label={`Quantity for line 9.${String(index + 1).padStart(2, "0")}`}
          />
          <input
            ref={(element) => {
              lineRefs.current[index] ??= {};
              lineRefs.current[index].price = element;
            }}
            value={line.price}
            onFocus={selectFieldText}
            onChange={(event) => update(index, "price", event.target.value)}
            onKeyDown={(event) => navigateLine(event, index, "price")}
            placeholder="Price"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            aria-label={`Price for line 9.${String(index + 1).padStart(2, "0")}`}
          />
          <select
            ref={(element) => {
              lineRefs.current[index] ??= {};
              lineRefs.current[index].fulfillment = element;
            }}
            value={line.fulfillment}
            onChange={(event) =>
              update(index, "fulfillment", event.target.value)
            }
            onKeyDown={(event) => navigateLine(event, index, "fulfillment")}
            aria-label={`Fulfillment for line 9.${String(index + 1).padStart(2, "0")}`}
          >
            <option value="">Fulfillment</option>
            {fulfillmentOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      ))}
      {lookupLine !== null && (
        <InventoryLookup
          products={products}
          onSelect={selectLookupItem}
          onClose={() => setLookupLine(null)}
        />
      )}{" "}
      {customerLookup && (
        <CustomerLookup
          customers={customers}
          onSelect={(customer) => {
            window.dispatchEvent(
              new CustomEvent("customer-selected", { detail: customer }),
            );
            setCustomerLookup(false);
          }}
          onClose={() => setCustomerLookup(false)}
        />
      )}
      {detailsProduct && (
        <ProductDetailsModal
          product={detailsProduct}
          onClose={() => {
            setDetailsProduct(null);
            if (actionLine !== null) focusLineField(actionLine, "quantity");
          }}
        />
      )}
      {coverageLine !== null && (
        <ProCoverageModal
          product={lines[coverageLine].product}
          onSelect={(coverage) => {
            const currentLine = coverageLine;
            const shouldAdvance = coverageAdvance;
            onChange((current) =>
              current.map((line, index) =>
                index === currentLine ? { ...line, coverage } : line,
              ),
            );
            setCoverageLine(null);
            setCoverageAdvance(false);
            if (shouldAdvance)
              window.setTimeout(
                () =>
                  currentLine < lines.length - 1
                    ? focusLineField(currentLine + 1, "itemNumber")
                    : addLine(),
                0,
              );
            else focusLineField(currentLine, "quantity");
          }}
          onClose={() => {
            setCoverageLine(null);
            setCoverageAdvance(false);
            if (!coverageAdvance) focusLineField(coverageLine, "quantity");
          }}
        />
      )}
      {addOnLine !== null && (
        <SuggestedAddOnsModal
          product={lines[addOnLine].product}
          products={products}
          onSelect={(addOn) => {
            onChange((current) => {
              const nextIndex = current.findIndex(
                (line, index) => index > addOnLine && !line.product,
              );
              const nextLine = {
                itemNumber: addOn.itemNumber,
                product: addOn,
                quantity: "1",
                price: String(addOn.price),
                coverage: null,
                fulfillment: fulfillmentLabel(addOn.location),
              };
              return nextIndex >= 0
                ? current.map((line, index) =>
                    index === nextIndex ? nextLine : line,
                  )
                : [...current, nextLine];
            });
            setAddOnLine(null);
            if (actionLine !== null) focusLineField(actionLine, "quantity");
          }}
          onClose={() => {
            setAddOnLine(null);
            if (actionLine !== null) focusLineField(actionLine, "quantity");
          }}
        />
      )}
      {imageProduct && (
        <ProductImageModal
          product={imageProduct}
          onClose={() => {
            setImageProduct(null);
            if (actionLine !== null) focusLineField(actionLine, "quantity");
          }}
        />
      )}
    </section>
  );
}

function ProductImageModal({ product, onClose }) {
  return (
    <div className="inventory-lookup-backdrop" onMouseDown={onClose}>
      <section
        className="product-image-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="lookup-title">
          <div>
            <p className="eyebrow">PRODUCT IMAGE</p>
            <h2>{product.name}</h2>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <img src={product.thumbnail} alt={product.name} />
      </section>
    </div>
  );
}

function ProductDetailsModal({ product, onClose }) {
  return (
    <div className="inventory-lookup-backdrop" onMouseDown={onClose}>
      <section
        className="product-details-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="lookup-title">
          <div>
            <p className="eyebrow">PRODUCT DETAILS</p>
            <h2>{product.name}</h2>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <p>{product.productDetails}</p>
      </section>
    </div>
  );
}

function SuggestedAddOnsModal({ product, products, onSelect, onClose }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [pendingChoice, setPendingChoice] = useState("");
  const addOns = products
    .filter(
      (candidate) =>
        candidate.category === "Accessories" &&
        candidate.stock > 0 &&
        candidate.id !== product.id,
    )
    .slice(0, 3);
  const toggle = (id) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selected) => selected !== id)
        : [...current, id],
    );
  const applySelected = () => {
    addOns.filter((addOn) => selectedIds.includes(addOn.id)).forEach(onSelect);
    onClose();
  };
  useEffect(() => {
    const handleKey = (event) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < addOns.length) {
        setPendingChoice(event.key);
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (pendingChoice) {
          toggle(addOns[Number(pendingChoice) - 1].id);
          setPendingChoice("");
        } else if (selectedIds.length) applySelected();
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [addOns, pendingChoice, selectedIds]);
  return (
    <div className="inventory-lookup-backdrop" onMouseDown={onClose}>
      <section
        className="product-details-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="lookup-title">
          <div>
            <p className="eyebrow">SUGGESTED ADD-ONS</p>
            <h2>{product.name}</h2>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        {pendingChoice && (
          <p className="lookup-shortcut">
            {pendingChoice} selected — press Enter to toggle.
          </p>
        )}
        {addOns.length ? (
          <div className="add-on-results">
            {addOns.map((addOn, index) => (
              <label className="add-on-choice" key={addOn.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(addOn.id)}
                  onChange={() => toggle(addOn.id)}
                />
                <kbd>{index + 1}</kbd>
                <img src={addOn.thumbnail} alt="" />
                <div>
                  <strong>{addOn.name}</strong>
                  <b>{money.format(addOn.price)}</b>
                </div>
              </label>
            ))}
            <button
              className="primary add-selected-add-ons"
              disabled={!selectedIds.length}
              onClick={applySelected}
            >
              Add selected
            </button>
          </div>
        ) : (
          <p>No available add ons.</p>
        )}
      </section>
    </div>
  );
}

function ProCoverageModal({ product, onSelect, onClose }) {
  const [pendingChoice, setPendingChoice] = useState("");
  const options = [
    ["5yr", 5, 0.18],
    ["3yr", 3, 0.15],
    ["2yr", 2, 0.1],
  ].map(([label, years, rate]) => ({
    label,
    years,
    price: Math.round(product.price * rate),
  }));
  useEffect(() => {
    const choose = (event) => {
      const key = event.key.toLowerCase();
      if (["1", "2", "3", "n"].includes(key)) {
        setPendingChoice(key);
        event.preventDefault();
        return;
      }
      if (key === "enter" && pendingChoice) {
        event.preventDefault();
        if (pendingChoice === "n") onSelect(null);
        else onSelect(options[Number(pendingChoice) - 1]);
      }
    };
    window.addEventListener("keydown", choose);
    return () => window.removeEventListener("keydown", choose);
  }, [options, onClose, onSelect, pendingChoice]);
  return (
    <div className="inventory-lookup-backdrop" onMouseDown={onClose}>
      <section
        className="product-details-modal coverage-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="lookup-title">
          <div>
            <p className="eyebrow">PRO COVERAGE</p>
            <h2>{product.name}</h2>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <p>
          Select a coverage plan. Press <b>1</b>, <b>2</b>, or <b>3</b>, then
          Enter; press <b>N</b> then Enter to decline.
        </p>
        {pendingChoice && (
          <p className="coverage-pending">
            {pendingChoice.toUpperCase()} selected — press Enter to confirm.
          </p>
        )}
        {options.map((option, index) => (
          <button
            className="coverage-option"
            key={option.label}
            onClick={() => onSelect(option)}
          >
            <kbd>{index + 1}</kbd>
            <span>
              <strong>{option.years} year coverage</strong>
              <small>{money.format(option.price)}</small>
            </span>
          </button>
        ))}
        <button className="coverage-decline" onClick={() => onSelect(null)}>
          <kbd>N</kbd> Decline coverage
        </button>
      </section>
    </div>
  );
}
function useLookupShortcut(matches, onSelect) {
  const [pendingSelection, setPendingSelection] = useState("");
  useEffect(() => {
    const handleKey = (event) => {
      if (/^[0-9]$/.test(event.key)) {
        setPendingSelection(event.key);
        event.preventDefault();
        return;
      }
      if (event.key === "Enter" && pendingSelection) {
        const index =
          pendingSelection === "0" ? 9 : Number(pendingSelection) - 1;
        if (matches[index]) onSelect(matches[index]);
        event.preventDefault();
      }
      if (event.key === "Escape") setPendingSelection("");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [matches, onSelect, pendingSelection]);
  return pendingSelection;
}

function InventoryLookup({ products, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const searchStarted = Boolean(query.trim());
  const matches = searchStarted
    ? products.filter(
        (product) =>
          product.stock > 0 &&
          `${product.itemNumber} ${product.name} ${product.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
    : [];
  const pendingSelection = useLookupShortcut(matches, onSelect);
  return (
    <div className="inventory-lookup-backdrop" onMouseDown={onClose}>
      <section
        className="inventory-lookup"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="lookup-title">
          <div>
            <p className="eyebrow">AVAILABLE INVENTORY</p>
            <h2>Item search</h2>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="lookup-search">
          <Icon name="search" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search item number, product name, or category"
          />
        </div>
        {pendingSelection && (
          <p className="lookup-shortcut">
            {pendingSelection === "0" ? "10" : pendingSelection} selected —
            press Enter to open.
          </p>
        )}
        <div className="lookup-results">
          {matches.map((product, index) => (
            <button key={product.id} onClick={() => onSelect(product)}>
              {index < 10 && (
                <kbd className="lookup-index">
                  {index === 9 ? "10" : index + 1}
                </kbd>
              )}
              <img src={product.thumbnail} alt="" />
              <div>
                <strong>{product.name}</strong>
                <span>
                  {product.itemNumber} · {product.category}
                </span>
                <small>
                  {product.stock} available · {fulfillmentLabel(product.location)}
                </small>
              </div>
              <b>{money.format(product.price)}</b>
            </button>
          ))}
          {!searchStarted ? (
            <p>Enter a search term to view available inventory.</p>
          ) : (
            !matches.length && <p>No available inventory matches your search.</p>
          )}
        </div>
      </section>
    </div>
  );
}
function CustomerLookup({ customers, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const searchStarted = Boolean(query.trim());
  const matches = searchStarted
    ? customers.filter((customer) =>
        `${customer.name} ${customer.phone ?? ""} ${customer.email}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : [];
  const pendingSelection = useLookupShortcut(matches, onSelect);
  return (
    <div className="inventory-lookup-backdrop" onMouseDown={onClose}>
      <section
        className="inventory-lookup"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="lookup-title">
          <div>
            <p className="eyebrow">CUSTOMER DIRECTORY</p>
            <h2>Customer search</h2>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="lookup-search">
          <Icon name="search" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="First name, last name, phone, or email"
          />
        </div>
        {pendingSelection && (
          <p className="lookup-shortcut">
            {pendingSelection === "0" ? "10" : pendingSelection} selected —
            press Enter to choose.
          </p>
        )}
        <div className="lookup-results">
          {matches.map((customer, index) => (
            <button key={customer.id} onClick={() => onSelect(customer)}>
              {index < 10 && (
                <kbd className="lookup-index">
                  {index === 9 ? "10" : index + 1}
                </kbd>
              )}
              <div>
                <strong>{customer.name}</strong>
                <span>
                  {customer.id} · {customer.email}
                </span>
                <small>{customer.phone ?? "No phone on file"}</small>
              </div>
            </button>
          ))}
          {!searchStarted ? (
            <p>Enter a search term to view customers.</p>
          ) : (
            !matches.length && <p>No customers match your search.</p>
          )}
        </div>
      </section>
    </div>
  );
}
function TicketMenu({ onSelect }) {
  return (
    <section className="ticket-menu">
      <p className="eyebrow">SALES TICKET PROCESSING MENU</p>
      <h2>Select an option</h2>
      <p className="ticket-intro">
        Choose a task below, or enter its number and press Enter for
        terminal-style navigation.
      </p>
      <div className="ticket-options">
        <button onClick={() => onSelect("entry")}>
          <kbd>1</kbd>
          <div>
            <strong>Sales Ticket Entry</strong>
            <span>Create a new ticket, add products, and complete a sale.</span>
          </div>
          <b>→</b>
        </button>
        <button onClick={() => onSelect("search")}>
          <kbd>2</kbd>
          <div>
            <strong>Search</strong>
            <span>Find a prior ticket by number, customer, or item.</span>
          </div>
          <b>→</b>
        </button>
      </div>
      <p className="ticket-hint">
        <kbd>2</kbd> then <kbd>↵</kbd> opens Sales Ticket Processing from
        anywhere outside a text field.
      </p>
    </section>
  );
}
function TicketSearch({ query, setQuery, onBack }) {
  const tickets = [
    {
      id: "ST-104892",
      customer: "Maya Chen",
      date: "Aug 29, 2026",
      total: "$178.57",
      items: "Heritage Denim Jacket, Stoneware Mug",
    },
    {
      id: "ST-104891",
      customer: "Avery Patel",
      date: "Aug 29, 2026",
      total: "$128.00",
      items: "Canvas Weekender",
    },
    {
      id: "ST-104876",
      customer: "Jordan Williams",
      date: "Aug 28, 2026",
      total: "$72.00",
      items: "Everyday Crew Tee × 3",
    },
  ];
  const results = tickets.filter((ticket) =>
    Object.values(ticket).join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="ticket-search-page">
      <div className="ticket-bar">
        <button onClick={onBack}>← Sales Ticket Processing</button>
        <span>2 · Search</span>
      </div>
      <div className="search-heading">
        <p className="eyebrow">TICKET LOOKUP</p>
        <h2>Search sales tickets</h2>
        <p>Mock transaction history for this proof of concept.</p>
      </div>
      <div className="ticket-search-input">
        <Icon name="search" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ticket number, customer, or item"
        />
      </div>
      <div className="ticket-results">
        {results.map((ticket) => (
          <button key={ticket.id}>
            <div>
              <strong>{ticket.id}</strong>
              <span>
                {ticket.customer} · {ticket.date}
              </span>
            </div>
            <span>{ticket.items}</span>
            <b>{ticket.total}</b>
          </button>
        ))}
        {!results.length && (
          <p className="no-results">No sales tickets match that search.</p>
        )}
      </div>
    </section>
  );
}
function MasterDatabaseMenu({ onSelect }) {
  return (
    <section className="ticket-menu">
      <p className="eyebrow">MASTER DATABASE MANAGEMENT</p>
      <h2>Select an option</h2>
      <p className="ticket-intro">
        Maintain the core customer and sales-person records used by the store.
      </p>
      <div className="ticket-options">
        <button onClick={() => onSelect("customers")}>
          <kbd>1</kbd>
          <div>
            <strong>Customer Master Maintenance</strong>
            <span>Create, update, and review customer master records.</span>
          </div>
          <b>→</b>
        </button>
        <button onClick={() => onSelect("salespeople")}>
          <kbd>2</kbd>
          <div>
            <strong>Sales Person Master</strong>
            <span>Review sales-person master records and assignments.</span>
          </div>
          <b>→</b>
        </button>
      </div>
      <p className="ticket-hint">
        <kbd>1</kbd> or <kbd>2</kbd>, then <kbd>↵</kbd>, opens a
        master-maintenance option.
      </p>
    </section>
  );
}
function InventoryManagementMenu({ onSelect }) {
  return (
    <section className="ticket-menu">
      <p className="eyebrow">INVENTORY MANAGEMENT</p>
      <h2>Select an option</h2>
      <p className="ticket-intro">
        Maintain SKU records or search the store inventory.
      </p>
      <div className="ticket-options">
        <button onClick={() => onSelect("sku")}>
          <kbd>1</kbd>
          <div>
            <strong>SKU Maintenance</strong>
            <span>Create, update, and review SKU records.</span>
          </div>
          <b>→</b>
        </button>
        <button onClick={() => onSelect("lookup")}>
          <kbd>2</kbd>
          <div>
            <strong>Item Lookup</strong>
            <span>Find an item by number, name, or category.</span>
          </div>
          <b>→</b>
        </button>
      </div>
      <p className="ticket-hint">
        <kbd>1</kbd> or <kbd>2</kbd>, then <kbd>↵</kbd>, opens an inventory
        option.
      </p>
    </section>
  );
}
function ItemLookup({ products }) {
  const [query, setQuery] = useState("");
  const matches = products.filter((product) =>
    `${product.itemNumber} ${product.name} ${product.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section className="ticket-search-page">
      <div className="search-heading">
        <p className="eyebrow">INVENTORY MANAGEMENT</p>
        <h2>Item Lookup</h2>
        <p>Search by item number, name, or category.</p>
      </div>
      <div className="ticket-search-input">
        <Icon name="search" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Item number, name, or category"
        />
      </div>
      <div className="ticket-results">
        {matches.map((product) => (
          <button key={product.id}>
            <div>
              <strong>{product.itemNumber}</strong>
              <span>
                {product.name} · {product.category}
              </span>
            </div>
            <span>
              {product.stock} available · {fulfillmentLabel(product.location)}
            </span>
            <b>{money.format(product.price)}</b>
          </button>
        ))}
        {!matches.length && (
          <p className="no-results">No inventory items match your search.</p>
        )}
      </div>
    </section>
  );
}
function SalesPersonMaster() {
  return (
    <section className="resource">
      <div className="resource-heading">
        <div>
          <p className="eyebrow">MASTER DATABASE MANAGEMENT</p>
          <h2>Sales Person Master</h2>
          <p>
            Sales-person master maintenance is ready for the next iteration.
          </p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Salesperson</th>
              <th>Employee ID</th>
              <th>Store</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Tim Eggenberger</strong>
                <small>Store Manager</small>
              </td>
              <td>800027</td>
              <td>Temple #499</td>
              <td>
                <span className="status">Active</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
function BarcodeScanner({ onClose, onScan }) {
  const videoRef = useRef(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let controls;
    let stopped = false;
    const startScanner = async () => {
      try {
        const [{ BrowserMultiFormatOneDReader, BarcodeFormat }, { DecodeHintType }] =
          await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        if (stopped) return;
        const hints = new Map([
          [
            DecodeHintType.POSSIBLE_FORMATS,
            [
              BarcodeFormat.UPC_A,
              BarcodeFormat.UPC_E,
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.CODE_128,
              BarcodeFormat.CODE_39,
              BarcodeFormat.ITF,
            ],
          ],
        ]);
        const reader = new BrowserMultiFormatOneDReader(hints, {
          delayBetweenScanAttempts: 150,
        });
        const nextControls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          },
          videoRef.current,
          (result) => {
            if (!result || stopped) return;
            stopped = true;
            controls?.stop();
            onScan(result.getText());
          },
        );
        controls = nextControls;
        if (stopped) controls.stop();
      } catch {
        if (!stopped)
          setError(
            "Camera access was unavailable. Check camera permission and try again.",
          );
      }
    };
    startScanner();
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [onScan]);
  return (
    <div className="barcode-scanner-backdrop" onMouseDown={onClose}>
      <section
        className="barcode-scanner"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-title">
          <h2>Scan barcode</h2>
          <button onClick={onClose} aria-label="Close scanner">
            <Icon name="close" />
          </button>
        </div>
        <p>Center the product barcode inside the camera view.</p>
        {error ? <p className="scanner-error">{error}</p> : <video ref={videoRef} muted playsInline />}
        <button className="primary scanner-cancel" type="button" onClick={onClose}>
          Cancel
        </button>
      </section>
    </div>
  );
}
function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title">
          <h2>{title}</h2>
          <button onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Dashboard() {
  const metrics = [
    ["Gross Sales", "$14,568"],
    ["Gross Margin", "$6,844"],
    ["Pro Coverage Attachment", "41.22%"],
    ["AUP", "$53.99"],
    ["IPT", "2.26"],
    ["PLCC", "4 apps"],
  ];
  return (
    <section className="dashboard">
      <p className="eyebrow">TEMPLE #499 · TODAY</p>
      <h2>Daily store metrics</h2>
      <div className="metric-grid">
        {metrics.map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>Today</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function ResourceView({
  title,
  subtitle,
  button,
  rows,
  type,
  onAdd,
  onEdit,
  onDelete,
}) {
  return (
    <section className="resource">
      <div className="resource-heading">
        <div>
          <p className="eyebrow">CATALOG MANAGEMENT</p>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <button className="primary add" onClick={onAdd}>
          <Icon name="plus" />
          {button}
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {type === "product" ? (
                <>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                </>
              ) : (
                <>
                  <th>Customer</th>
                  <th>Tier</th>
                  <th>Visits</th>
                  <th>Lifetime spend</th>
                  <th></th>
                </>
              )}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {type === "product" ? (
                  <>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.id}</small>
                    </td>
                    <td>{row.category}</td>
                    <td>{money.format(row.price)}</td>
                    <td>{row.stock}</td>
                    <td>
                      <span
                        className={`status ${row.status.toLowerCase().replaceAll(" ", "-")}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <strong>{row.name}</strong>
                      <small>
                        {row.email} · {row.id}
                      </small>
                    </td>
                    <td>
                      <span className={`tier ${row.tier.toLowerCase()}`}>
                        {row.tier}
                      </span>
                    </td>
                    <td>{row.visits}</td>
                    <td>{money.format(row.spend)}</td>
                    <td></td>
                  </>
                )}
                <td className="row-actions">
                  <button onClick={() => onEdit(row)} title="Edit">
                    <Icon name="edit" />
                  </button>
                  <button onClick={() => onDelete(row.id)} title="Delete">
                    <Icon name="trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function AppearanceSettings({ appearance, setAppearance }) {
  return (
    <section className="settings">
      <div className="settings-heading">
        <p className="eyebrow">PERSONAL PREFERENCES</p>
        <h2>Appearance</h2>
        <p>
          Make Guitar Center POS feel familiar to the people who use it every
          day.
        </p>
      </div>
      <div className="settings-card">
        <div>
          <h3>Color mode</h3>
          <p>Use a darker workspace for lower-light environments.</p>
        </div>
        <button
          className={`switch ${appearance.dark ? "on" : ""}`}
          onClick={() => setAppearance((a) => ({ ...a, dark: !a.dark }))}
          aria-label="Toggle dark mode"
        >
          <span />
        </button>
      </div>
      <div className="settings-card stacked">
        <div>
          <h3>Text style</h3>
          <p>
            Legacy terminal uses crisp fixed-width text inspired by green-screen
            workflows.
          </p>
        </div>
        <div className="choice-row">
          {[
            ["modern", "Modern interface"],
            ["terminal", "Legacy terminal"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`choice ${appearance.text === value ? "chosen" : ""}`}
              onClick={() => setAppearance((a) => ({ ...a, text: value }))}
            >
              <span className={value}>
                {value === "terminal" ? ">_ 5250" : "Aa"}
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-card stacked">
        <div>
          <h3>Theme color</h3>
          <p>Choose an accent for key actions, focus states, and navigation.</p>
        </div>
        <div className="palette-row">
          {Object.entries(palettes).map(([id, item]) => (
            <button
              key={id}
              className={`palette ${appearance.palette === id ? "chosen" : ""}`}
              onClick={() => setAppearance((a) => ({ ...a, palette: id }))}
            >
              <i style={{ background: item.accent }} />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="terminal-note">
        <span>▣</span>
        <div>
          <strong>AS400-inspired recipe</strong>
          <p>
            For a classic phosphor-terminal feel, choose Dark mode, Legacy
            terminal text, and Phosphor Green.
          </p>
        </div>
      </div>
    </section>
  );
}
