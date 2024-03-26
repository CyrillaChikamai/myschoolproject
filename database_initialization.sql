create table Users(
  id              serial PRIMARY KEY,
  first_name      VARCHAR(32),
  last_name       VARCHAR(32),
  email           VARCHAR(64),
  password        VARCHAR(32),  --insecure, store the hash of the password instead for apps in production
  reminders_html  TEXT
);

-- this table contains the information about all the drugs
create table Item(
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(64),
  image_url     TEXT,
  category      VARCHAR(64),
  rrp           money,
  manufacturer  VARCHAR(64)
);

-- this table stores each drug in user inventories
create table Inventory(
  id             serial PRIMARY key,
  owner          INTEGER, --pointer to the User(id) who registered this drug batch
  item_id        INTEGER,
  batch_size     INTEGER,
  batch_id       VARCHAR(64),
  date_added     TIMESTAMPTZ,
  exp_date       TIMESTAMPTZ,
  date_sold      TIMESTAMPTZ,
  mfg_date       TIMESTAMPTZ
);