# elm-constants

> Generate constant values in Elm from your environment

Based on a config file, this tool will generate an Elm file of environment variables so you don't
have to pass them to Elm with flags and keep them around in your model.

# Install

`yarn add --dev elm-constants`

or

`npm install elm-constants --save-dev`

# Usage

Add a config file to the root of your project called `elm-constants.json`.

Populate it like this:
```
{
  "path": "./path/to/elm/dir",
  "moduleName": "Constants",
  "values": [
    ["SERVER_URL", "backendUrl"],
    "GOOGLE_API_KEY"
  ]
}
```

For the `values` field you can have either a regular string or an array with two values. If you specify
a regular string, this tool will automatically convert it to a valid Elm variable name. In the case of `GOOGLE_API_KEY`,
it would generate `googleApiKey`. If you're not happy with the generated name or just want to rename it anyways,
you can specify an array where the first value is the environment variable and the second is the Elm name.

Then, in your pre-build step, run `yarn elm-constants` (or `npx elm-constants`) to generate an Elm file!

Based on the above config, you would get something like:
```
module Constants exposing (googleApiKey, serverUrl)


googleApiKey : String
googleApiKey =
    "def"


backendUrl : String
backendUrl =
    "abc"
```


# CLI Options
```
Options:
  --version, -v     Print the installed version                  [boolean]
  --no-dotenv       Dont' use dotenv                             [boolean]
  --env-path, -p    Path to env file                             [string]
  --config, -c      Path to config file                          [string]
  --help, -h        Show help                                    [boolean]
```

## Config Schema

The schema for the config file.

```
{ "path": : String
, "moduleName" : String
, "values" : [String, String] | String
}
```

# Dotenv

This package automatically works with [`dotenv`](https://github.com/motdotla/dotenv).
By default this will look for an `.env` file at current working directory. Alternatively you 
may provide a path flag (`--env-path`) for a custom file such as `--env-path=./env/.env.staging`.
If you run `elm-constants` in and `NODE_ENV` is **not** `production`, then this tool automatically loads that file.

If you want to turn this off, just pass `--no-dotenv` to `elm-constants`

# Rationale

Have you ever been writing an Elm app and started off like this:

```
type alias Flags =
  { serverUrl : String
  , googleApiKey : String
  , ...
  }


init : Flags -> ( Model, Cmd Msg )
init flags =
  ( { severUrl = flags.severUrl, googleApiKey = flags.googleApiKey, ... }
  , fetch flags.serverUrl
  )
```

And if you're writing an SPA, you have to pass those flag down to every page:

```
type Msg
  = PageMsg Page.Msg
  
  
update : Msg -> Model -> ( Model, Cmd Msg )
update msg model = 
    case (msg, model.page) of
       (PageMsg subMsg, PageModel subModel) ->
            let
                (nextSubModel, nextSubMsg) =
                    Page.update model.serverUrl -- Pass serverUrl down to each page
                        subMsg
                        subModel
            in
            ( { model | page = PageModel nextSubModel }
            , nextSubMsg |> Cmd.map PageMsg
            )
        ...
      
view : Model -> Html Msg
view model =
    case model.page of
       PageModel subModel ->
           Page.view model.googleApiKey subModel -- Pass googleApiKey to each page 
       ...
```

I got tired of havng to keep these seemingly static pieces of data in the model and having to pass them everywhere.
So I wrote a way to generate an Elm constants file based on your environment!

# Thanks

Thanks to [`elm-graphql`](https://package.elm-lang.org/packages/dillonkearns/elm-graphql/latest) for making me think to use
file generation to solve a problem.

